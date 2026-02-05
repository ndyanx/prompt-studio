import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { db } from "../db/db";

const SYNC_INTERVAL = 30000; // 30 segundos
const MIN_SYNC_INTERVAL = 30000; // Mínimo 30 segundos entre syncs
const MAX_RETRIES = 3;
let syncInterval = null;
let isSyncing = false;
let retryCount = 0;
let isTabVisible = true;
let lastSuccessfulSync = 0; // Timestamp del último sync exitoso

export function useSyncManager() {
  const lastSyncTime = ref(null);
  const isSyncingNow = ref(false);
  const syncError = ref(null);
  const syncEnabled = ref(true);

  // Verificar si ha pasado suficiente tiempo desde el último sync
  const canSyncNow = (isManual = false) => {
    if (isManual) return true; // Sync manual siempre permitido

    const now = Date.now();
    const timeSinceLastSync = now - lastSuccessfulSync;

    if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
      const remainingTime = Math.ceil(
        (MIN_SYNC_INTERVAL - timeSinceLastSync) / 1000,
      );
      console.log(
        `⏳ Throttle activo: espera ${remainingTime}s más para próximo sync`,
      );
      return false;
    }

    return true;
  };

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

  const syncToSupabase = async (isManual = false) => {
    if (!syncEnabled.value || isSyncing) return;

    // Throttle: verificar tiempo mínimo entre syncs
    if (!canSyncNow(isManual)) {
      return;
    }

    // No sincronizar si la pestaña no está visible (excepto manual)
    if (!isTabVisible && !isManual) {
      console.log("⏸️  Sync pausado: pestaña no visible");
      return;
    }

    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      console.log("📡 Sync pausado: sin conexión a internet");
      return;
    }

    isSyncing = true;
    isSyncingNow.value = true;
    syncError.value = null;

    try {
      // Verificar autenticación
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.log("⏸️  Sync pausado: usuario no autenticado");
        return;
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
            sync_method: "periodic_capture",
          },
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) throw error;

      // Éxito
      lastSyncTime.value = new Date().toISOString();
      lastSuccessfulSync = Date.now(); // Actualizar timestamp para throttling
      retryCount = 0;

      console.log("✅ Snapshot sincronizado:", {
        tasks: snapshot.tasks.length,
        time: lastSyncTime.value,
      });
    } catch (error) {
      console.error("❌ Error en sync:", error);
      syncError.value = error.message;

      // Reintento exponencial
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.log(`🔄 Reintento ${retryCount}/${MAX_RETRIES} en ${delay}ms`);

        setTimeout(() => {
          syncToSupabase();
        }, delay);
      }
    } finally {
      isSyncing = false;
      isSyncingNow.value = false;
    }
  };

  const startSync = async () => {
    if (syncInterval) clearInterval(syncInterval);

    // Verificar si hay usuario autenticado antes de iniciar
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.log("⏸️  Sync no iniciado: usuario no autenticado");
      return;
    }

    syncInterval = setInterval(() => {
      syncToSupabase();
    }, SYNC_INTERVAL);

    // Sync inmediato al iniciar (después de 2s para dar tiempo a que cargue todo)
    setTimeout(() => {
      syncToSupabase();
    }, 2000);

    console.log("🔄 Sync service iniciado (30s interval)");
  };

  const stopSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    console.log("⏸️  Sync service detenido");
  };

  const manualSync = async () => {
    console.log("🔄 Sincronización manual solicitada");
    await syncToSupabase(true); // true = manual, ignora throttle
  };

  const restoreFromSupabase = async () => {
    try {
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

      if (error) throw error;
      if (!data)
        return { success: false, message: "No hay snapshots guardados" };

      const snapshot = data.snapshot_data;

      // Restaurar a IndexedDB
      await db.tasks.clear();
      if (snapshot.tasks && snapshot.tasks.length > 0) {
        await db.tasks.bulkAdd(snapshot.tasks);
      }

      console.log("🔄 Snapshot restaurado:", snapshot.tasks.length, "tareas");
      return {
        success: true,
        tasks: snapshot.tasks.length,
        timestamp: snapshot.timestamp,
      };
    } catch (error) {
      console.error("❌ Error restaurando snapshot:", error);
      return { success: false, error: error.message };
    }
  };

  // Detener sync cuando el usuario cierra sesión
  const handleSignOut = () => {
    stopSync();
    lastSyncTime.value = null;
    syncError.value = null;
    retryCount = 0;
    lastSuccessfulSync = 0; // Resetear throttle
    console.log("🔒 Sync detenido por cierre de sesión");
  };

  // Manejar cambios de visibilidad de la pestaña
  const handleVisibilityChange = () => {
    isTabVisible = !document.hidden;

    if (isTabVisible) {
      console.log("👁️  Pestaña visible");
      // Intentar sincronizar (respetando throttle)
      syncToSupabase(false); // false = no es manual, aplica throttle
    } else {
      console.log("🙈 Pestaña oculta - pausando sincronización automática");
    }
  };

  // Manejar reconexión a internet
  const handleOnline = () => {
    console.log("🌐 Conexión a internet restaurada");
    // Intentar sincronizar (respetando throttle)
    syncToSupabase(false); // false = no es manual, aplica throttle
  };

  const handleOffline = () => {
    console.log("📡 Sin conexión a internet - sync pausado");
  };

  // Restaurar automáticamente al iniciar sesión
  const handleSignIn = async () => {
    console.log("🔐 Iniciando sesión, restaurando datos desde Supabase...");

    try {
      const result = await restoreFromSupabase();

      if (result.success && result.tasks > 0) {
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
      window.dispatchEvent(new CustomEvent("create-default-task"));
    }

    // Iniciar sincronización
    startSync();
  };

  onMounted(async () => {
    // Esperar un poco para que useAuth se inicialice primero
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Inicializar estado de visibilidad
    isTabVisible = !document.hidden;

    // Verificar si hay sesión antes de iniciar sync
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      console.log("✅ Sesión detectada, iniciando sync...");
      await startSync();
    } else {
      console.log("ℹ️  No hay sesión, esperando login para iniciar sync");
    }

    // Agregar listeners
    window.addEventListener("user-signed-out", handleSignOut);
    window.addEventListener("user-signed-in", handleSignIn);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onUnmounted(() => {
    stopSync();
    window.removeEventListener("user-signed-out", handleSignOut);
    window.removeEventListener("user-signed-in", handleSignIn);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  return {
    lastSyncTime,
    isSyncingNow,
    syncError,
    syncEnabled,
    manualSync,
    stopSync,
    startSync,
    restoreFromSupabase,
  };
}
