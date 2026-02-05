import { ref, onMounted, onUnmounted } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { db } from "../db/db";

const SYNC_INTERVAL = 15000; // 15 segundos
const MAX_RETRIES = 3;
let syncInterval = null;
let isSyncing = false;
let retryCount = 0;

export function useSyncManager() {
  const lastSyncTime = ref(null);
  const isSyncingNow = ref(false);
  const syncError = ref(null);
  const syncEnabled = ref(true);

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

  const syncToSupabase = async () => {
    if (!syncEnabled.value) {
      console.log("⏸️  Sync deshabilitado");
      return;
    }

    if (isSyncing) {
      console.log("⏸️  Sync ya en progreso, saltando...");
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
        isSyncing = false;
        isSyncingNow.value = false;
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
      console.log("⏰ Intervalo de sync ejecutándose (30s)...");
      syncToSupabase();
    }, SYNC_INTERVAL);

    // Sync inmediato al iniciar (después de 2s para dar tiempo a que cargue todo)
    setTimeout(() => {
      console.log("🔄 Sync inicial después de login...");
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
    await syncToSupabase();
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
    console.log("🔒 Sync detenido por cierre de sesión");
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

  // Forzar sincronización inmediata cuando se dispara el evento
  const handleForceSync = async () => {
    console.log("🔄 Sincronización forzada por cambio importante");
    await syncToSupabase();
  };

  onMounted(async () => {
    // Esperar un poco para que useAuth se inicialice primero
    await new Promise((resolve) => setTimeout(resolve, 100));

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

    window.addEventListener("user-signed-out", handleSignOut);
    window.addEventListener("user-signed-in", handleSignIn);
    window.addEventListener("force-sync", handleForceSync);
  });

  onUnmounted(() => {
    stopSync();
    window.removeEventListener("user-signed-out", handleSignOut);
    window.removeEventListener("user-signed-in", handleSignIn);
    window.removeEventListener("force-sync", handleForceSync);
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
