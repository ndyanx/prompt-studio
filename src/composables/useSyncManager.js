import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { db } from "../db/db";

const MAX_RETRIES = 3;
const THROTTLE_TIME = 10000; // 10 segundos entre sincronizaciones manuales
let isSyncing = false;
let retryCount = 0;
let throttleTimeout = null;
let isRestoringData = false;

// Estado compartido como singleton para que múltiples componentes
// lean el mismo estado sin duplicar listeners ni lógica
const lastSyncTime = ref(null);
const isSyncingNow = ref(false);
const syncError = ref(null);
const syncSuccess = ref(false);
const isOffline = ref(!navigator.onLine);
const isThrottled = ref(false);
const throttleSecondsRemaining = ref(0);

let isInitialized = false;
let cleanupFunctions = [];

export function useSyncManager() {
  // Solo se sincronizan datos de tasks_auth (usuario autenticado).
  // tasks_local es offline-only y nunca se envía a Supabase.
  const generateSnapshot = async () => {
    try {
      const allTasks = await db.tasks_auth.toArray();
      const settings = await db.settings.toArray();

      return {
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        tasks: allTasks,
        settings: settings,
        stats: {
          totalTasks: allTasks.length,
        },
      };
    } catch (error) {
      console.error("Error generando snapshot:", error);
      throw error;
    }
  };

  // Bloquea sincronizaciones adicionales durante THROTTLE_TIME segundos
  // para evitar escrituras excesivas en Supabase
  const startThrottle = () => {
    isThrottled.value = true;
    throttleSecondsRemaining.value = 10;

    if (throttleTimeout) clearInterval(throttleTimeout);

    throttleTimeout = setInterval(() => {
      throttleSecondsRemaining.value--;

      if (throttleSecondsRemaining.value <= 0) {
        clearInterval(throttleTimeout);
        throttleTimeout = null;
        isThrottled.value = false;
        throttleSecondsRemaining.value = 0;
      }
    }, 1000);
  };

  const syncToSupabase = async (isManual = true) => {
    if (isSyncing)
      return { success: false, error: "Sincronización en progreso" };

    if (isThrottled.value) {
      return {
        success: false,
        error: `Espera ${throttleSecondsRemaining.value} segundos`,
        throttled: true,
      };
    }

    if (!isManual)
      return { success: false, error: "Solo sincronización manual" };

    if (!navigator.onLine || isOffline.value) {
      syncError.value = "Sin conexión a internet";
      setTimeout(() => {
        syncError.value = null;
      }, 3000);
      return { success: false, error: "Sin conexión a internet" };
    }

    isSyncing = true;
    isSyncingNow.value = true;
    syncError.value = null;
    syncSuccess.value = false;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuario no autenticado");

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

      // Reintento con backoff exponencial, solo cuando hay conexión
      if (navigator.onLine) {
        retryCount++;
        if (retryCount <= MAX_RETRIES && isManual) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            syncToSupabase(true);
          }, delay);
        }
      }

      return { success: false, error: errorMessage };
    } finally {
      isSyncing = false;
      isSyncingNow.value = false;
    }
  };

  const manualSync = async () => {
    return await syncToSupabase(true);
  };

  // Descarga el snapshot más reciente desde Supabase y lo escribe en tasks_auth.
  // Limpia tasks_auth antes de restaurar para evitar duplicados.
  const restoreFromSupabase = async () => {
    try {
      if (!navigator.onLine || isOffline.value) {
        return {
          success: false,
          error: "Sin conexión a internet",
          offline: true,
        };
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuario no autenticado");

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

      if (snapshot.tasks && snapshot.tasks.length > 0) {
        await db.tasks_auth.bulkAdd(snapshot.tasks);
      }

      return {
        success: true,
        tasks: snapshot.tasks.length,
        timestamp: snapshot.timestamp,
      };
    } catch (error) {
      console.error("Error restaurando snapshot:", error);

      if (!navigator.onLine) {
        return {
          success: false,
          error: "Sin conexión a internet",
          offline: true,
        };
      }

      return { success: false, error: error.message };
    }
  };

  const handleSignOut = () => {
    lastSyncTime.value = null;
    syncError.value = null;
    syncSuccess.value = false;
    retryCount = 0;
    isThrottled.value = false;
    throttleSecondsRemaining.value = 0;
    isRestoringData = false;

    if (throttleTimeout) {
      clearInterval(throttleTimeout);
      throttleTimeout = null;
    }

    // Pequeño delay para que clearLocalData() en usePromptManager termine antes de recargar
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("data-restored"));
    }, 100);
  };

  const handleOnline = () => {
    isOffline.value = false;
    syncError.value = null;
  };

  const handleOffline = () => {
    isOffline.value = true;
  };

  // Al iniciar sesión, restaura los datos desde Supabase y notifica a usePromptManager.
  // El flag isRestoringData previene ejecuciones simultáneas si el evento se dispara más de una vez.
  const handleSignIn = async () => {
    if (isRestoringData) return;

    isRestoringData = true;

    try {
      const result = await restoreFromSupabase();

      if (result.offline) {
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else if (result.success && result.tasks > 0) {
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else if (result.success && result.tasks === 0) {
        const authTasks = await db.tasks_auth.count();
        if (authTasks === 0) {
          window.dispatchEvent(new CustomEvent("create-default-task"));
        } else {
          window.dispatchEvent(new CustomEvent("data-restored"));
        }
      } else {
        const authTasks = await db.tasks_auth.count();
        if (authTasks === 0) {
          window.dispatchEvent(new CustomEvent("create-default-task"));
        } else {
          window.dispatchEvent(new CustomEvent("data-restored"));
        }
      }
    } catch (error) {
      console.error("Error restaurando datos al iniciar sesión:", error);
      const authTasks = await db.tasks_auth.count();
      if (authTasks > 0) {
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else {
        window.dispatchEvent(new CustomEvent("create-default-task"));
      }
    } finally {
      setTimeout(() => {
        isRestoringData = false;
      }, 1000);
    }
  };

  const initSync = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await handleSignIn();
      } else {
        // Sin sesión: verificar si hay datos huérfanos en tasks_auth
        // (puede ocurrir si el usuario borró el localStorage manualmente)
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
    } catch (error) {
      console.error("Error inicializando sync:", error);
    }
  };

  onMounted(async () => {
    if (!isInitialized) {
      isInitialized = true;

      isOffline.value = !navigator.onLine;

      await initSync();

      window.addEventListener("user-signed-out", handleSignOut);
      window.addEventListener("user-signed-in", handleSignIn);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
  });

  onUnmounted(() => {
    const cleanup = () => {
      if (throttleTimeout) {
        clearInterval(throttleTimeout);
        throttleTimeout = null;
      }

      window.removeEventListener("user-signed-out", handleSignOut);
      window.removeEventListener("user-signed-in", handleSignIn);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      isInitialized = false;
    };

    cleanupFunctions.push(cleanup);
  });

  return {
    lastSyncTime,
    isSyncingNow,
    syncError,
    syncSuccess,
    isOffline,
    isThrottled,
    throttleSecondsRemaining,
    manualSync,
    restoreFromSupabase,
  };
}
