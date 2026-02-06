import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { db } from "../db/db";

const MAX_RETRIES = 3;
const THROTTLE_TIME = 10000; // 10 segundos
let isSyncing = false;
let retryCount = 0;
let throttleTimeout = null;

export function useSyncManager() {
  const lastSyncTime = ref(null);
  const isSyncingNow = ref(false);
  const syncError = ref(null);
  const syncSuccess = ref(false);
  const isOffline = ref(!navigator.onLine);
  const isThrottled = ref(false); // Nuevo: indica si está en cooldown
  const throttleSecondsRemaining = ref(0); // Nuevo: segundos restantes

  const generateSnapshot = async () => {
    try {
      const allTasks = await db.tasks.toArray();
      const settings = await db.settings.toArray();

      return {
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        tasks: allTasks,
        settings: settings,
        stats: {
          totalTasks: allTasks.length,
          totalColors: allTasks.reduce(
            (sum, task) => sum + Object.keys(task.colors || {}).length,
            0,
          ),
        },
      };
    } catch (error) {
      console.error("❌ Error generando snapshot:", error);
      throw error;
    }
  };

  // Iniciar countdown de throttle
  const startThrottle = () => {
    isThrottled.value = true;
    throttleSecondsRemaining.value = 10;

    // Limpiar timeout anterior si existe
    if (throttleTimeout) {
      clearInterval(throttleTimeout);
    }

    // Countdown cada segundo
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

    // Verificar throttle
    if (isThrottled.value) {
      console.log(
        `⏳ Throttle activo: espera ${throttleSecondsRemaining.value} segundos más`,
      );
      return {
        success: false,
        error: `Espera ${throttleSecondsRemaining.value} segundos`,
        throttled: true,
      };
    }

    // Solo sincronizar si es manual (ya no hay sync automático)
    if (!isManual)
      return { success: false, error: "Solo sincronización manual" };

    // Verificar si hay conexión a internet
    if (!navigator.onLine || isOffline.value) {
      syncError.value = "Sin conexión a internet";
      console.log("📡 Sin conexión a internet - sync cancelado");

      // Mostrar error por 3 segundos
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
      // Verificar autenticación
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Usuario no autenticado");
      }

      // Generar snapshot
      const snapshot = await generateSnapshot();

      // Subir a Supabase
      const { data, error } = await supabase.from("user_snapshots").upsert(
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
        {
          onConflict: "user_id",
        },
      );

      if (error) throw error;

      // Éxito
      lastSyncTime.value = new Date().toISOString();
      retryCount = 0;
      syncSuccess.value = true;

      console.log("✅ Snapshot sincronizado manualmente:", {
        tasks: snapshot.tasks.length,
        time: lastSyncTime.value,
      });

      // Iniciar throttle de 10 segundos
      startThrottle();

      // Resetear animación de éxito después de 2 segundos
      setTimeout(() => {
        syncSuccess.value = false;
      }, 2000);

      return { success: true, tasks: snapshot.tasks.length };
    } catch (error) {
      console.error("❌ Error en sync:", error);

      // Determinar tipo de error
      let errorMessage = error.message;
      if (!navigator.onLine) {
        errorMessage = "Sin conexión a internet";
      } else if (error.message.includes("autenticado")) {
        errorMessage = "Sesión expirada";
      } else if (error.code === "PGRST301" || error.code === "PGRST116") {
        errorMessage = "Error de servidor";
      }

      syncError.value = errorMessage;

      // Reintento exponencial solo para sync manual (excepto offline)
      if (!navigator.onLine) {
        console.log("📡 Error de conexión - no se reintentará");
      } else {
        retryCount++;
        if (retryCount <= MAX_RETRIES && isManual) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(
            `🔄 Reintento ${retryCount}/${MAX_RETRIES} en ${delay}ms`,
          );

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
    console.log("🔄 Sincronización manual solicitada");
    return await syncToSupabase(true);
  };

  const restoreFromSupabase = async () => {
    try {
      // Verificar conexión
      if (!navigator.onLine || isOffline.value) {
        console.log("📡 Sin conexión - usando datos locales");
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

      console.log("📥 Restaurando datos desde Supabase...");

      const { data, error } = await supabase
        .from("user_snapshots")
        .select("snapshot_data")
        .eq("user_id", session.user.id)
        .order("last_updated", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Si no hay datos, no es un error crítico
        if (error.code === "PGRST116") {
          console.log("ℹ️ No hay snapshots guardados en Supabase");
          return { success: false, message: "No hay snapshots guardados" };
        }
        throw error;
      }

      if (!data) {
        return { success: false, message: "No hay snapshots guardados" };
      }

      const snapshot = data.snapshot_data;

      // Restaurar a IndexedDB
      await db.tasks.clear();
      if (snapshot.tasks && snapshot.tasks.length > 0) {
        await db.tasks.bulkAdd(snapshot.tasks);
      }

      console.log("✅ Snapshot restaurado:", snapshot.tasks.length, "tareas");
      return {
        success: true,
        tasks: snapshot.tasks.length,
        timestamp: snapshot.timestamp,
      };
    } catch (error) {
      console.error("❌ Error restaurando snapshot:", error);

      // Si es error de conexión, usar datos locales
      if (!navigator.onLine) {
        console.log("📡 Error de conexión - usando datos locales");
        return {
          success: false,
          error: "Sin conexión a internet",
          offline: true,
        };
      }

      return { success: false, error: error.message };
    }
  };

  // Detener sync cuando el usuario cierra sesión
  const handleSignOut = () => {
    lastSyncTime.value = null;
    syncError.value = null;
    syncSuccess.value = false;
    retryCount = 0;
    isThrottled.value = false;
    throttleSecondsRemaining.value = 0;
    if (throttleTimeout) {
      clearInterval(throttleTimeout);
      throttleTimeout = null;
    }
    console.log("🔒 Sync reiniciado por cierre de sesión");
  };

  // Manejar reconexión a internet
  const handleOnline = () => {
    console.log("🌐 Conexión a internet restaurada");
    isOffline.value = false;
    syncError.value = null;
  };

  const handleOffline = () => {
    console.log("📡 Sin conexión a internet");
    isOffline.value = true;
  };

  // Restaurar automáticamente al iniciar sesión
  const handleSignIn = async () => {
    console.log("🔑 Iniciando sesión, restaurando datos desde Supabase...");

    try {
      const result = await restoreFromSupabase();

      if (result.offline) {
        // Sin conexión, usar datos locales
        console.log("📱 Modo offline - usando datos locales");
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else if (result.success && result.tasks > 0) {
        console.log(`✅ ${result.tasks} tareas restauradas desde Supabase`);
        // Emitir evento para que usePromptManager recargue las tareas
        window.dispatchEvent(new CustomEvent("data-restored"));
      } else if (result.success && result.tasks === 0) {
        console.log("ℹ️ No hay tareas en Supabase, creando tarea por defecto");
        window.dispatchEvent(new CustomEvent("create-default-task"));
      } else {
        console.log(
          "ℹ️ No hay snapshot en Supabase, creando tarea por defecto",
        );
        window.dispatchEvent(new CustomEvent("create-default-task"));
      }
    } catch (error) {
      console.error("❌ Error restaurando datos:", error);
      // No romper la app, usar datos locales
      window.dispatchEvent(new CustomEvent("data-restored"));
    }
  };

  // Al montar el componente, verificar si hay sesión activa y restaurar
  const initSync = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        console.log("✅ Sesión activa detectada, restaurando datos...");
        await handleSignIn();
      } else {
        console.log("ℹ️ No hay sesión activa");
      }
    } catch (error) {
      console.error("❌ Error inicializando sync:", error);
      // No romper la app, continuar con datos locales
    }
  };

  onMounted(async () => {
    // Inicializar estado de conexión
    isOffline.value = !navigator.onLine;

    // Inicializar y restaurar si hay sesión
    await initSync();

    // Agregar listeners
    window.addEventListener("user-signed-out", handleSignOut);
    window.addEventListener("user-signed-in", handleSignIn);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onUnmounted(() => {
    // Limpiar throttle timeout
    if (throttleTimeout) {
      clearInterval(throttleTimeout);
      throttleTimeout = null;
    }

    window.removeEventListener("user-signed-out", handleSignOut);
    window.removeEventListener("user-signed-in", handleSignIn);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  return {
    lastSyncTime,
    isSyncingNow,
    syncError,
    syncSuccess,
    isOffline,
    isThrottled, // Nuevo: exponer estado de throttle
    throttleSecondsRemaining, // Nuevo: exponer segundos restantes
    manualSync,
    restoreFromSupabase,
  };
}
