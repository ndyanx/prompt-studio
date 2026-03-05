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

  // IDs de tareas escritas por este dispositivo en Supabase.
  // Permite ignorar el eco de Realtime y evitar el loop write → realtime → write.
  // Fix #2: TTL de 10s — si el write falla antes del echo, el ID se auto-limpia
  // y no bloquea updates legítimos del mismo ID en el futuro.
  const localWriteIds = new Set();
  const LOCAL_WRITE_TTL = 10_000;
  const addLocalWriteId = (id) => {
    localWriteIds.add(id);
    setTimeout(() => localWriteIds.delete(id), LOCAL_WRITE_TTL);
  };

  const hasPending = computed(() => pendingCount.value > 0);

  // Fix #4: helper centralizado — loguea + puebla syncError para que la UI
  // pueda mostrarlo. Se auto-limpia a los 5s para no bloquear la UI.
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

  // Fix #5: backoff exponencial para reintentos de flush.
  // Si Supabase falla, esperamos 1s → 2s → 4s → … hasta MAX_BACKOFF.
  // Evita saturar la red cuando el servidor está caído.
  let flushBackoffDelay = 1000;
  const MAX_FLUSH_BACKOFF = 30_000;
  const resetFlushBackoff = () => {
    flushBackoffDelay = 1000;
  };

  const flushPendingQueue = async () => {
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
          resetFlushBackoff(); // operación exitosa — resetear backoff
        } catch (error) {
          setSyncError("Error en flush de cola offline", error);
          // Backoff exponencial: programar reintento y abortar el loop actual
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
    }
  };

  // ─── Carga desde Supabase ─────────────────────────────────────────────────

  const loadTasksFromSupabase = async (userId) => {
    try {
      unsubscribeFromRealtime(); // ← pausar antes del clear

      // Supabase limita a 1000 filas por query por defecto.
      // Con más de 1000 tareas, un .select() sin paginación trunca silenciosamente
      // los resultados → loadTasksFromSupabase hace db.tasks.clear() y solo
      // restaura las 1000 más recientes, perdiendo el resto permanentemente.
      // La solución es paginar con .range() hasta agotar los resultados.
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

        // Si la página devolvió menos filas que PAGE_SIZE, es la última
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      await db.tasks.clear();
      await db.pendingSync.clear();

      if (allRows.length > 0) {
        const normalized = allRows.map((row) =>
          normalizeTask({
            id: row.id,
            name: row.name,
            prompt: row.prompt,
            media: row.media,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
        );
        // bulkPut (upsert) evita BulkError si Realtime o promptStore escribieron
        // entre el clear() y esta línea.
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

  const subscribeToRealtime = (userId) => {
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
      // Ignorar cambios originados por este dispositivo para evitar el loop
      // write → Realtime → write.
      const changedId = eventType === "DELETE" ? oldRow?.id : newRow?.id;
      if (changedId && localWriteIds.has(changedId)) {
        localWriteIds.delete(changedId);
        return;
      }

      if (eventType === "DELETE") {
        // Sin REPLICA IDENTITY FULL, Supabase solo envía la PK en oldRow.
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

  const handleSignIn = async () => {
    if (isHandlingSignIn) return;
    isHandlingSignIn = true;
    try {
      const session = await getSession();
      if (!session) return;
      currentUserId = session.user.id;

      const result = await loadTasksFromSupabase(currentUserId);
      emit(
        result.success && result.count > 0
          ? APP_EVENTS.DATA_RESTORED
          : APP_EVENTS.CREATE_DEFAULT_TASK,
      );

      subscribeToRealtime(currentUserId);
      await refreshPendingCount();
    } catch (error) {
      setSyncError("Error en handleSignIn", error);
      emit(APP_EVENTS.CREATE_DEFAULT_TASK);
    } finally {
      isHandlingSignIn = false;
    }
  };

  const handleSignOut = async () => {
    unsubscribeFromRealtime();
    currentUserId = null;
    await db.tasks.clear();
    await db.pendingSync.clear();
    syncError.value = null;
    isSyncingNow.value = false;
    lastSyncTime.value = null;
    pendingCount.value = 0;
    emit(APP_EVENTS.DATA_RESTORED);
  };

  // ─── Conectividad ─────────────────────────────────────────────────────────

  const handleOnline = async () => {
    isOffline.value = false;
    syncError.value = null;
    await flushPendingQueue();
  };

  const handleOffline = () => {
    isOffline.value = true;
  };

  // ─── Init / Cleanup ───────────────────────────────────────────────────────

  const initSync = async () => {
    isOffline.value = !navigator.onLine;
    const session = await getSession();

    if (session) {
      currentUserId = session.user.id;
      await handleSignIn();
    } else {
      await db.pendingSync.clear();
      await refreshPendingCount();
      const count = await db.tasks.count();
      if (count === 0) emit(APP_EVENTS.CREATE_DEFAULT_TASK);
    }

    window.addEventListener(APP_EVENTS.SIGNED_IN, handleSignIn);
    window.addEventListener(APP_EVENTS.SIGNED_OUT, handleSignOut);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  };

  const cleanup = () => {
    unsubscribeFromRealtime();
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
    cleanup,
  };
});
