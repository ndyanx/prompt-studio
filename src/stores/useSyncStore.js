import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { db } from "../db/db";

const MAX_RETRIES = 3;
const THROTTLE_TIME = 10000;

export const useSyncStore = defineStore("sync", () => {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const lastSyncTime = ref(null);
  const isSyncingNow = ref(false);
  const syncError = ref(null);
  const syncSuccess = ref(false);
  const isOffline = ref(!navigator.onLine);
  const isThrottled = ref(false);
  const throttleSecondsRemaining = ref(0);

  let isSyncing = false;
  let retryCount = 0;
  let throttleInterval = null;
  let isRestoringData = false;
  const retryTimeouts = new Set();

  // ─── Helpers internos ─────────────────────────────────────────────────────

  const getOfflineError = () => {
    if (!navigator.onLine || isOffline.value) return "Sin conexión a internet";
    return null;
  };

  const getAuthSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Usuario no autenticado");
    return session;
  };

  const setTemporaryError = (message, ms = 3000) => {
    syncError.value = message;
    setTimeout(() => {
      syncError.value = null;
    }, ms);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const generateSnapshot = async () => {
    try {
      const allTasks = await db.tasks_auth.toArray();
      const settings = await db.settings.toArray();

      return {
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        tasks: allTasks,
        settings,
        stats: { totalTasks: allTasks.length },
      };
    } catch (error) {
      console.error("Error generando snapshot:", error);
      throw error;
    }
  };

  const startThrottle = () => {
    isThrottled.value = true;
    throttleSecondsRemaining.value = THROTTLE_TIME / 1000;

    if (throttleInterval) clearInterval(throttleInterval);

    throttleInterval = setInterval(() => {
      throttleSecondsRemaining.value--;
      if (throttleSecondsRemaining.value <= 0) {
        clearInterval(throttleInterval);
        throttleInterval = null;
        isThrottled.value = false;
        throttleSecondsRemaining.value = 0;
      }
    }, 1000);
  };

  const syncToSupabase = async (isManual = true) => {
    if (isSyncing)
      return { success: false, error: "Sincronización en progreso" };
    if (!isManual)
      return { success: false, error: "Solo sincronización manual" };

    if (isThrottled.value) {
      return {
        success: false,
        error: `Espera ${throttleSecondsRemaining.value} segundos`,
        throttled: true,
      };
    }

    const offlineError = getOfflineError();
    if (offlineError) {
      setTemporaryError(offlineError);
      return { success: false, error: offlineError };
    }

    if (isManual) retryCount = 0;

    isSyncing = true;
    isSyncingNow.value = true;
    syncError.value = null;
    syncSuccess.value = false;

    try {
      const session = await getAuthSession();
      const snapshot = await generateSnapshot();

      const { error } = await supabase.from("user_snapshots").upsert(
        {
          user_id: session.user.id,
          snapshot_data: snapshot,
          last_updated: new Date().toISOString(),
          metadata: {
            device: navigator.userAgent,
            platform: navigator.platform,
            sync_method: "manual",
          },
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;

      lastSyncTime.value = new Date().toISOString();
      retryCount = 0;
      syncSuccess.value = true;
      startThrottle();

      setTimeout(() => {
        syncSuccess.value = false;
      }, 2000);

      return { success: true, tasks: snapshot.tasks.length };
    } catch (error) {
      console.error("Error en sync:", error);

      let errorMessage = error.message;
      if (!navigator.onLine) {
        errorMessage = "Sin conexión a internet";
      } else if (error.message.includes("autenticado")) {
        errorMessage = "Sesión expirada";
      } else if (error.code === "PGRST301" || error.code === "PGRST116") {
        errorMessage = "Error de servidor";
      }

      syncError.value = errorMessage;

      if (navigator.onLine && isManual && retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        const retryId = setTimeout(() => {
          retryTimeouts.delete(retryId);
          syncToSupabase(true);
        }, delay);
        retryTimeouts.add(retryId);
      }

      return { success: false, error: errorMessage };
    } finally {
      isSyncing = false;
      isSyncingNow.value = false;
    }
  };

  const manualSync = () => syncToSupabase(true);

  const restoreFromSupabase = async () => {
    const offlineError = getOfflineError();
    if (offlineError)
      return { success: false, error: offlineError, offline: true };

    try {
      const session = await getAuthSession();

      const { data, error } = await supabase
        .from("user_snapshots")
        .select("snapshot_data")
        .eq("user_id", session.user.id)
        .order("last_updated", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return { success: false, message: "No hay snapshots guardados" };
        }
        throw error;
      }

      if (!data)
        return { success: false, message: "No hay snapshots guardados" };

      const snapshot = data.snapshot_data;
      await db.tasks_auth.clear();

      if (snapshot.tasks?.length > 0) {
        await db.tasks_auth.bulkAdd(snapshot.tasks);
      }

      return {
        success: true,
        tasks: snapshot.tasks.length,
        timestamp: snapshot.timestamp,
      };
    } catch (error) {
      console.error("Error restaurando snapshot:", error);
      const offlineErr = getOfflineError();
      if (offlineErr)
        return { success: false, error: offlineErr, offline: true };
      return { success: false, error: error.message };
    }
  };

  // ─── Manejadores de eventos globales ──────────────────────────────────────

  const handleOnline = () => {
    isOffline.value = false;
    syncError.value = null;
  };

  const handleOffline = () => {
    isOffline.value = true;
  };

  const handleSignOut = () => {
    lastSyncTime.value = null;
    syncError.value = null;
    syncSuccess.value = false;
    retryCount = 0;
    isThrottled.value = false;
    throttleSecondsRemaining.value = 0;
    isRestoringData = false;

    retryTimeouts.forEach(clearTimeout);
    retryTimeouts.clear();

    if (throttleInterval) {
      clearInterval(throttleInterval);
      throttleInterval = null;
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("data-restored"));
    }, 100);
  };

  const handleSignIn = async () => {
    if (isRestoringData) return;
    isRestoringData = true;

    try {
      const result = await restoreFromSupabase();
      const hasRestoredTasks = result.success && result.tasks > 0;
      const authTasksCount = await db.tasks_auth.count();

      if (hasRestoredTasks || authTasksCount > 0) {
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else {
        window.dispatchEvent(new CustomEvent("create-default-task"));
      }
    } catch (error) {
      console.error("Error restaurando datos al iniciar sesión:", error);
      const authTasksCount = await db.tasks_auth.count();
      const event =
        authTasksCount > 0 ? "data-restored" : "create-default-task";
      window.dispatchEvent(new CustomEvent(event));
    } finally {
      setTimeout(() => {
        isRestoringData = false;
      }, 1000);
    }
  };

  const initSync = async () => {
    try {
      isOffline.value = !navigator.onLine;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await handleSignIn();
      } else {
        const authTasksCount = await db.tasks_auth.count();
        if (authTasksCount > 0) {
          console.warn(
            `Datos huérfanos en tasks_auth (${authTasksCount} tareas) — limpiando`,
          );
          await db.tasks_auth.clear();
        }

        const localTasksCount = await db.tasks_local.count();
        if (localTasksCount === 0) {
          window.dispatchEvent(new CustomEvent("create-default-task"));
        }
      }

      window.addEventListener("user-signed-out", handleSignOut);
      window.addEventListener("user-signed-in", handleSignIn);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    } catch (error) {
      console.error("Error inicializando sync:", error);
    }
  };

  const cleanup = () => {
    retryTimeouts.forEach(clearTimeout);
    retryTimeouts.clear();

    if (throttleInterval) {
      clearInterval(throttleInterval);
      throttleInterval = null;
    }

    window.removeEventListener("user-signed-out", handleSignOut);
    window.removeEventListener("user-signed-in", handleSignIn);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };

  return {
    // Estado
    lastSyncTime,
    isSyncingNow,
    syncError,
    syncSuccess,
    isOffline,
    isThrottled,
    throttleSecondsRemaining,
    // Actions
    initSync,
    manualSync,
    restoreFromSupabase,
    cleanup,
  };
});
