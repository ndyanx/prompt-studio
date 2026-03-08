import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "../supabase/supabaseClient";
import {
  db,
  normalizeTask,
  SYNC_OPERATIONS,
  enqueuePendingSync,
  getPendingSyncs,
  removePendingSync,
} from "../db/db";
import { APP_EVENTS, emit } from "../events/events";
import { tabCoordinator, TAB_MESSAGES } from "../sync/tabCoordinator";

export const useSyncStore = defineStore("sync", () => {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const isOffline = ref(!navigator.onLine);
  const isSyncingNow = ref(false);
  const syncError = ref(null);
  const pendingCount = ref(0);
  const lastSyncTime = ref(null);

  let realtimeChannel = null;
  let currentUserId = null;
  let isHandlingSignIn = false;

  const localWriteIds = new Set();
  const LOCAL_WRITE_TTL = 10_000;
  const addLocalWriteId = (id) => {
    localWriteIds.add(id);
    setTimeout(() => localWriteIds.delete(id), LOCAL_WRITE_TTL);
  };

  const hasPending = computed(() => pendingCount.value > 0);

  let syncErrorTimer = null;
  const setSyncError = (msg, err) => {
    console.error(msg, err);
    if (syncErrorTimer) clearTimeout(syncErrorTimer);
    syncError.value = typeof err?.message === "string" ? err.message : msg;
    syncErrorTimer = setTimeout(() => {
      syncError.value = null;
    }, 5000);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const refreshPendingCount = async () => {
    const all = await getPendingSyncs();
    pendingCount.value = all.length;
  };

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  // ─── Sync individual (fire-and-forget) ────────────────────────────────────

  const syncTaskToSupabase = async (
    task,
    operation = SYNC_OPERATIONS.UPSERT,
  ) => {
    const session = await getSession();
    if (!session) return;

    if (isOffline.value) {
      await enqueuePendingSync(task.id, operation, task);
      await refreshPendingCount();
      return;
    }

    try {
      if (operation === SYNC_OPERATIONS.DELETE) {
        addLocalWriteId(task.id);
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id)
          .eq("user_id", session.user.id);
        if (error) throw error;
      } else {
        addLocalWriteId(task.id);
        const { error } = await supabase.from("tasks").upsert(
          {
            id: task.id,
            user_id: session.user.id,
            name: task.name,
            prompt: task.prompt,
            media: task.media,
            created_at: task.createdAt,
            updated_at: task.updatedAt,
          },
          { onConflict: "id" },
        );
        if (error) throw error;
      }
      lastSyncTime.value = new Date().toISOString();
    } catch (error) {
      if (!navigator.onLine) {
        await enqueuePendingSync(task.id, operation, task);
        await refreshPendingCount();
      } else {
        setSyncError("Error sincronizando tarea", error);
      }
    }
  };

  // ─── Flush cola offline ───────────────────────────────────────────────────

  let flushBackoffDelay = 1000;
  const MAX_FLUSH_BACKOFF = 30_000;
  const resetFlushBackoff = () => {
    flushBackoffDelay = 1000;
  };

  const flushPendingQueue = async () => {
    // Solo la pestaña líder ejecuta el flush — evita escrituras triplicadas.
    if (!tabCoordinator.isLeader) return;

    const session = await getSession();
    if (!session || isOffline.value) return;

    const pending = await getPendingSyncs();
    if (pending.length === 0) return;

    isSyncingNow.value = true;

    try {
      for (const item of pending) {
        try {
          if (item.operation === SYNC_OPERATIONS.DELETE) {
            addLocalWriteId(item.taskId);
            const { error } = await supabase
              .from("tasks")
              .delete()
              .eq("id", item.taskId)
              .eq("user_id", session.user.id);
            if (error) throw error;
          } else {
            if (!item.payload) {
              await removePendingSync(item.id);
              continue;
            }
            addLocalWriteId(item.payload.id);
            const { error } = await supabase.from("tasks").upsert(
              {
                id: item.payload.id,
                user_id: session.user.id,
                name: item.payload.name,
                prompt: item.payload.prompt,
                media: item.payload.media,
                created_at: item.payload.createdAt,
                updated_at: item.payload.updatedAt,
              },
              { onConflict: "id" },
            );
            if (error) throw error;
          }
          await removePendingSync(item.id);
          resetFlushBackoff();
        } catch (error) {
          setSyncError("Error en flush de cola offline", error);
          const delay = flushBackoffDelay;
          flushBackoffDelay = Math.min(
            flushBackoffDelay * 2,
            MAX_FLUSH_BACKOFF,
          );
          setTimeout(flushPendingQueue, delay);
          break;
        }
      }
    } finally {
      await refreshPendingCount();
      lastSyncTime.value = new Date().toISOString();
      isSyncingNow.value = false;
      tabCoordinator.broadcast(TAB_MESSAGES.FLUSH_DONE);
    }
  };

  // ─── Borrar todas las tareas del usuario en Supabase ─────────────────────

  const deleteAllFromSupabase = async () => {
    const session = await getSession();
    if (!session) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id);

    if (error) throw error;
  };

  const loadTasksFromSupabase = async (userId) => {
    try {
      unsubscribeFromRealtime();

      const PAGE_SIZE = 1000;
      let from = 0;
      let allRows = [];

      while (true) {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        allRows.push(...data);

        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      await db.tasks.clear();
      await db.pendingSync.clear();

      // Filtrar tareas default que se subieron a Supabase antes de que
      // createNewTask tuviera el guard de sesión — son basura acumulada.
      const DEFAULT_PROMPT = "Escribe tu prompt aquí.";
      const DEFAULT_NAME = "Nueva Tarea";
      const cleanRows = allRows.filter((row) => {
        const isDefault =
          row.name === DEFAULT_NAME &&
          row.prompt === DEFAULT_PROMPT &&
          (!row.media ||
            (Array.isArray(row.media) &&
              row.media.every((m) => !m.url_post && !m.url_video)));
        if (isDefault) {
          // Borrar en background — no bloquear la carga
          supabase
            .from("tasks")
            .delete()
            .eq("id", row.id)
            .then(() => {});
        }
        return !isDefault;
      });

      if (cleanRows.length > 0) {
        const normalized = cleanRows.map((row) =>
          normalizeTask({
            id: row.id,
            name: row.name,
            prompt: row.prompt,
            media: row.media,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
        );
        await db.tasks.bulkPut(normalized);
        return { success: true, count: normalized.length };
      }
      return { success: true, count: 0 };
    } catch (error) {
      setSyncError("Error cargando desde Supabase", error);
      return { success: false, error: error.message };
    }
  };

  // ─── Realtime ─────────────────────────────────────────────────────────────

  /**
   * Solo la pestaña líder abre el WebSocket con Supabase Realtime.
   * Cuando recibe un cambio lo aplica en su IndexedDB y lo reenvía a las demás
   * pestañas via BroadcastChannel → de N WebSockets se pasa a 1.
   */
  const subscribeToRealtime = (userId) => {
    if (!tabCoordinator.isLeader) return;

    unsubscribeFromRealtime();
    realtimeChannel = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await handleRealtimeChange(payload);
          tabCoordinator.broadcast(TAB_MESSAGES.REALTIME_FORWARDED, {
            payload,
          });
        },
      )
      .subscribe();
  };

  const unsubscribeFromRealtime = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };

  const handleRealtimeChange = async ({
    eventType,
    new: newRow,
    old: oldRow,
  }) => {
    try {
      const changedId = eventType === "DELETE" ? oldRow?.id : newRow?.id;
      if (changedId && localWriteIds.has(changedId)) {
        localWriteIds.delete(changedId);
        return;
      }

      if (eventType === "DELETE") {
        if (!oldRow?.id) {
          console.warn("Realtime DELETE recibido sin id en oldRow — ignorado");
          return;
        }
        await db.tasks.delete(oldRow.id);
      } else {
        const normalized = normalizeTask({
          id: newRow.id,
          name: newRow.name,
          prompt: newRow.prompt,
          media: newRow.media,
          createdAt: newRow.created_at,
          updatedAt: newRow.updated_at,
        });
        await db.tasks.put(normalized);
      }
      emit(APP_EVENTS.REALTIME_CHANGE);
    } catch (error) {
      setSyncError("Error en Realtime", error);
    }
  };

  // ─── Auth handlers ────────────────────────────────────────────────────────

  // Carga datos del usuario autenticado. Si broadcastSignIn=true, notifica
  // a otras pestañas para que recarguen (solo cuando el login ocurrió ahora,
  // no en la carga inicial donde la sesión ya existía).
  const _loadSession = async (broadcastSignIn = false) => {
    if (isHandlingSignIn) return;
    isHandlingSignIn = true;
    try {
      const session = await getSession();
      if (!session) return;
      currentUserId = session.user.id;

      if (broadcastSignIn) {
        tabCoordinator.broadcast(TAB_MESSAGES.SIGNED_IN);
      }

      const result = await loadTasksFromSupabase(currentUserId);
      // Solo emitir cuando el login fue activo (broadcastSignIn=true).
      // En carga inicial (false), promptStore.init() llama loadTasks()
      // directamente justo después — el emit sería redundante y podría
      // disparar una segunda loadTasks() con datos inconsistentes.
      if (broadcastSignIn) {
        emit(
          result.success && result.count > 0
            ? APP_EVENTS.DATA_RESTORED
            : APP_EVENTS.CREATE_DEFAULT_TASK,
        );
      }
      subscribeToRealtime(currentUserId);
      await refreshPendingCount();
    } catch (error) {
      setSyncError("Error en sign-in", error);
      // Solo crear tarea default si fue login activo — en carga inicial
      // promptStore.init() manejará el estado vacío directamente.
      if (broadcastSignIn) emit(APP_EVENTS.CREATE_DEFAULT_TASK);
    } finally {
      isHandlingSignIn = false;
    }
  };

  // Llamado por useAuthStore cuando el usuario hace login activamente.
  const handleSignIn = () => _loadSession(true);

  const handleSignOut = async () => {
    // Notificar a otras pestañas primero — ellas harán location.reload().
    tabCoordinator.broadcast(TAB_MESSAGES.SIGNED_OUT);
    // Limpiar estado local de esta pestaña.
    unsubscribeFromRealtime();
    currentUserId = null;
    await db.tasks.clear();
    await db.pendingSync.clear();
    syncError.value = null;
    isSyncingNow.value = false;
    lastSyncTime.value = null;
    pendingCount.value = 0;
    // Recargar esta pestaña también — igual que las otras.
    // Evita la race condition donde esta pestaña crea una tarea default en
    // IndexedDB mientras la otra pestaña también recarga y crea la suya.
    window.location.reload();
  };

  // ─── Conectividad ─────────────────────────────────────────────────────────

  const handleOnline = async () => {
    isOffline.value = false;
    syncError.value = null;
    await flushPendingQueue(); // guard interno: solo corre si isLeader
  };

  const handleOffline = () => {
    isOffline.value = true;
  };

  // ─── Listeners de BroadcastChannel ───────────────────────────────────────

  const initBroadcastListeners = () => {
    // Pestaña no-líder recibe cambio de Realtime reenviado por la líder
    tabCoordinator.on(TAB_MESSAGES.REALTIME_FORWARDED, async ({ payload }) => {
      if (tabCoordinator.isLeader) return;
      await handleRealtimeChange(payload);
    });

    // Otra pestaña tomó el liderazgo — cerrar nuestro WebSocket si lo teníamos
    tabCoordinator.on(TAB_MESSAGES.LEADER_ACK, ({ tabId }) => {
      if (tabId !== tabCoordinator.tabId && realtimeChannel) {
        unsubscribeFromRealtime();
      }
    });

    // Cuando otra pestaña inicia sesión, recargar para obtener estado limpio.
    tabCoordinator.on(TAB_MESSAGES.SIGNED_IN, () => {
      window.location.reload();
    });

    // Cuando otra pestaña cierra sesión, recargar esta página.
    // Es la solución más simple y confiable: evita coordinar la limpieza
    // de stores async y garantiza un estado 100% limpio tras el logout.
    tabCoordinator.on(TAB_MESSAGES.SIGNED_OUT, () => {
      window.location.reload();
    });
  };

  // ─── Init / Cleanup ───────────────────────────────────────────────────────

  const initSync = async () => {
    tabCoordinator.init();
    // Elegir líder antes de cualquier operación que use isLeader.
    // Sin esta llamada, isLeader siempre es false y subscribeToRealtime
    // nunca abre el WebSocket → realtime nunca funciona.
    tabCoordinator.electLeader();
    initBroadcastListeners();

    isOffline.value = !navigator.onLine;
    const session = await getSession();

    if (session) {
      currentUserId = session.user.id;
      await _loadSession(false); // sesión existente al cargar — no broadcastear
    } else {
      await db.pendingSync.clear();
      await refreshPendingCount();
      // No emitir CREATE_DEFAULT_TASK aquí — promptStore.init() llama
      // loadTasks() justo después y crea la default si la DB está vacía.
    }

    window.addEventListener(APP_EVENTS.SIGNED_IN, handleSignIn);
    // APP_EVENTS.SIGNED_OUT llega del DOM local (emitido por useAuthStore.signOut).
    // Llamamos handleSignOut para que broadcastee a las otras pestañas.
    window.addEventListener(APP_EVENTS.SIGNED_OUT, handleSignOut);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  };

  const cleanup = () => {
    unsubscribeFromRealtime();
    tabCoordinator.destroy();
    window.removeEventListener(APP_EVENTS.SIGNED_IN, handleSignIn);
    window.removeEventListener(APP_EVENTS.SIGNED_OUT, handleSignOut);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };

  return {
    isOffline,
    isSyncingNow,
    syncError,
    pendingCount,
    lastSyncTime,
    hasPending,
    initSync,
    syncTaskToSupabase,
    flushPendingQueue,
    deleteAllFromSupabase,
    cleanup,
  };
});
