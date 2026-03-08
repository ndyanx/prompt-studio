/**
 * tabCoordinator.js
 *
 * Coordina múltiples pestañas abiertas del mismo usuario usando BroadcastChannel.
 *
 * Problemas que resuelve:
 *  1. Race condition en login: solo UNA pestaña ejecuta loadTasksFromSupabase()
 *     (la "líder"), las demás esperan y cargan desde IndexedDB cuando reciben
 *     el evento DATA_LOADED.
 *  2. Flush triplicado: solo la pestaña líder ejecuta flushPendingQueue() al
 *     volver online. Las demás ignoran el evento.
 *  3. 3 WebSockets: solo la líder suscribe al canal Realtime de Supabase.
 *     Distribuye los cambios a las demás pestañas via BroadcastChannel.
 *
 * Elección de líder: la primera pestaña en llamar electLeader() "gana" usando
 * un lock optimista en localStorage con TTL. Si la líder se cierra, la siguiente
 * pestaña que intente operar tomará el liderazgo automáticamente.
 */

const CHANNEL_NAME = "prompt-studio-sync";
const LEADER_KEY = "prompt-studio-leader-id";
const LEADER_TTL = 8_000; // ms — la líder renueva cada 5s; si no renueva en 8s, expiró

// Mensajes del canal
export const TAB_MESSAGES = {
  // Líder → Resto: cambio de Realtime recibido, IndexedDB actualizado
  REALTIME_FORWARDED: "realtime-forwarded",
  // Líder → Resto: flush de cola offline completado
  FLUSH_DONE: "flush-done",
  // Cualquiera → Resto: el usuario inició sesión en esta pestaña
  // Permite que las demás pestañas reaccionen sin esperar un evento de DOM local.
  SIGNED_IN: "signed-in",
  // Cualquiera → Resto: el usuario cerró sesión en esta pestaña
  // Sin esto, las otras pestañas mantienen tasks en memoria hasta recarga.
  SIGNED_OUT: "signed-out",
  // Líder → Resto: confirma que esta pestaña es la líder activa.
  // Se emite al ganar la elección y en respuesta a REQUEST_LEADER.
  LEADER_ACK: "leader-ack",
  // Cualquiera → Líder: solicita que el líder se identifique.
  // Útil para que una pestaña nueva sepa quién lidera sin esperar renovación.
  REQUEST_LEADER: "request-leader",
};

class TabCoordinator {
  constructor() {
    this._tabId = crypto.randomUUID();
    this._isLeader = false;
    this._channel = null;
    this._leaderRenewTimer = null;
    this._listeners = new Map(); // message type → Set<callback>
    this._ready = false;
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  init() {
    if (this._ready) return;
    this._ready = true;

    // BroadcastChannel no está disponible en algunos workers, pero sí en todos
    // los contextos de ventana modernos (Chrome 54+, FF 38+, Safari 15.4+).
    if (typeof BroadcastChannel === "undefined") {
      // Fallback: actuar siempre como líder (comportamiento original)
      this._isLeader = true;
      return;
    }

    this._channel = new BroadcastChannel(CHANNEL_NAME);
    this._channel.onmessage = (e) => this._handleMessage(e.data);

    // Escuchar cierre de pestaña para liberar liderazgo
    window.addEventListener("beforeunload", () => this._releaseLeader());
  }

  // ─── Liderazgo ────────────────────────────────────────────────────────────

  /**
   * Intenta tomar el liderazgo. Devuelve true si esta pestaña es la líder,
   * false si hay otra pestaña que ya lidera.
   *
   * Estrategia: lock en localStorage con timestamp. Si el lock expiró (TTL),
   * cualquier pestaña puede tomarlo.
   */
  electLeader() {
    if (!this._ready) this.init();

    // Sin BroadcastChannel: siempre líder
    if (!this._channel) return true;

    const existing = this._readLeaderLock();
    const now = Date.now();

    if (!existing || now - existing.ts > LEADER_TTL) {
      // Lock libre o expirado — tomar el liderazgo
      this._writeLeaderLock();
      this._isLeader = true;
      this._startLeaderRenew();
      this._broadcast({ type: TAB_MESSAGES.LEADER_ACK, tabId: this._tabId });
      return true;
    }

    if (existing.id === this._tabId) {
      // Ya somos líderes (re-elección tras reconexión)
      this._isLeader = true;
      return true;
    }

    // Otra pestaña es la líder
    this._isLeader = false;
    return false;
  }

  get isLeader() {
    return this._isLeader;
  }

  get tabId() {
    return this._tabId;
  }

  // ─── Mensajería ───────────────────────────────────────────────────────────

  broadcast(type, payload = {}) {
    this._broadcast({ type, ...payload });
  }

  /**
   * Suscribirse a un tipo de mensaje entrante (de otras pestañas).
   * Devuelve una función para desuscribirse.
   */
  on(type, callback) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(callback);
    return () => this._listeners.get(type)?.delete(callback);
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _broadcast(msg) {
    try {
      this._channel?.postMessage({ ...msg, _from: this._tabId });
    } catch (_) {
      // Canal cerrado — ignorar
    }
  }

  _handleMessage(data) {
    // Ignorar mensajes propios
    if (data._from === this._tabId) return;

    const callbacks = this._listeners.get(data.type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }

    // Si alguien pide saber quién lidera, responder si somos líderes
    if (data.type === TAB_MESSAGES.REQUEST_LEADER && this._isLeader) {
      this._broadcast({ type: TAB_MESSAGES.LEADER_ACK, tabId: this._tabId });
    }
  }

  _readLeaderLock() {
    try {
      const raw = localStorage.getItem(LEADER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  _writeLeaderLock() {
    try {
      localStorage.setItem(
        LEADER_KEY,
        JSON.stringify({ id: this._tabId, ts: Date.now() }),
      );
    } catch (_) {}
  }

  _startLeaderRenew() {
    clearInterval(this._leaderRenewTimer);
    // Renovar el lock cada 5s para señalizar que seguimos vivos
    this._leaderRenewTimer = setInterval(() => {
      if (this._isLeader) this._writeLeaderLock();
    }, 5_000);
  }

  _releaseLeader() {
    if (!this._isLeader) return;
    clearInterval(this._leaderRenewTimer);
    try {
      const existing = this._readLeaderLock();
      if (existing?.id === this._tabId) {
        localStorage.removeItem(LEADER_KEY);
      }
    } catch (_) {}
  }

  destroy() {
    this._releaseLeader();
    this._channel?.close();
    this._channel = null;
    this._listeners.clear();
    this._ready = false;
  }
}

// Singleton — una instancia por pestaña
export const tabCoordinator = new TabCoordinator();
