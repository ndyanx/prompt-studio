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
  const localWriteIds = new Set();

  const hasPending = computed(() => pendingCount.value > 0);

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
        localWriteIds.add(task.id);
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id)
          .eq("user_id", session.user.id);
        if (error) throw error;
      } else {
        localWriteIds.add(task.id);
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
        console.error("Error sincronizando tarea:", error);
        syncError.value = error.message;
        setTimeout(() => (syncError.value = null), 3000);
      }
    }
  };

  // ─── Flush cola offline ───────────────────────────────────────────────────

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
            localWriteIds.add(item.taskId);
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
            localWriteIds.add(item.payload.id);
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
        } catch (error) {
          console.error("Error en flush:", error);
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

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      await db.tasks.clear();
      await db.pendingSync.clear();

      if (data && data.length > 0) {
        const normalized = data.map((row) =>
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
      console.error("Error cargando desde Supabase:", error);
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
      console.error("Error en Realtime:", error);
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
      console.error("Error en handleSignIn:", error);
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
