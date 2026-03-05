import Dexie from "dexie";

export const db = new Dexie("PromptStudioDB");

// v1: schema original
db.version(1).stores({
  tasks: "id, name, createdAt, updatedAt",
  settings: "key",
});

// v2: tablas separadas por tipo de sesión
db.version(2)
  .stores({
    tasks: null,
    tasks_local: "id, name, createdAt, updatedAt",
    tasks_auth: "id, name, createdAt, updatedAt",
    settings: "key",
  })
  .upgrade(async (tx) => {
    const oldTasks = await tx.table("tasks").toArray();
    if (oldTasks.length > 0) {
      await tx.table("tasks_local").bulkAdd(oldTasks);
    }
  });

// v3: soporte para media como array de slots { url_post, url_video }
db.version(3).stores({
  tasks_local: "id, name, createdAt, updatedAt",
  tasks_auth: "id, name, createdAt, updatedAt",
  settings: "key",
});

// v4: tabla única tasks + cola pendingSync para operaciones offline.
// tasks_local y tasks_auth se eliminan. user_id vive solo en Supabase.
db.version(4)
  .stores({
    tasks_local: null,
    tasks_auth: null,
    tasks: "id, name, createdAt, updatedAt",
    pendingSync: "++id, taskId, operation, createdAt",
    settings: "key",
  })
  .upgrade(async (tx) => {
    // Solo migramos tasks_local (anónimas).
    // tasks_auth se descarta: al hacer login se restauran desde Supabase.
    try {
      const localTasks = await tx.table("tasks_local").toArray();
      if (localTasks.length > 0) {
        await tx.table("tasks").bulkAdd(localTasks);
      }
    } catch (_) {
      // tasks_local no existía en este usuario, nada que migrar
    }
  });

// ─── Normalización ────────────────────────────────────────────────────────────

export function normalizeTask(raw) {
  return {
    ...raw,
    media:
      Array.isArray(raw.media) && raw.media.length > 0
        ? raw.media.map((m) => ({
            url_post: m.url_post || "",
            url_video: m.url_video || "",
            width: m.width || null,
            height: m.height || null,
          }))
        : [{ url_post: "", url_video: "", width: null, height: null }],
  };
}

export class Task {
  constructor(data = {}) {
    // Date.now() * 1000 + random(999) da suficiente entropía para evitar
    // colisiones en creaciones rápidas, manteniendo BIGINT en Supabase.
    this.id = data.id || Date.now() * 1000 + Math.floor(Math.random() * 1000);
    this.name = data.name || "Nueva Tarea";
    this.prompt = data.prompt || "Escribe tu prompt aquí.";
    this.media =
      Array.isArray(data.media) && data.media.length > 0
        ? data.media.map((m) => ({
            url_post: m.url_post || "",
            url_video: m.url_video || "",
            width: m.width || null,
            height: m.height || null,
          }))
        : [{ url_post: "", url_video: "", width: null, height: null }];
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }
}

// ─── Cola de sync pendiente ───────────────────────────────────────────────────

export const SYNC_OPERATIONS = {
  UPSERT: "upsert",
  DELETE: "delete",
};

export async function enqueuePendingSync(taskId, operation, payload = null) {
  try {
    // Reemplazamos operaciones previas del mismo task para no acumular upserts.
    await db.pendingSync.where("taskId").equals(taskId).delete();
    await db.pendingSync.add({
      taskId,
      operation,
      payload,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Error encolando sync pendiente:", error);
  }
}

export async function getPendingSyncs() {
  try {
    return await db.pendingSync.orderBy("createdAt").toArray();
  } catch (error) {
    console.error("Error obteniendo syncs pendientes:", error);
    return [];
  }
}

export async function removePendingSync(id) {
  try {
    await db.pendingSync.delete(id);
  } catch (error) {
    console.error("Error eliminando sync pendiente:", error);
  }
}

// ─── Migración desde localStorage (legacy) ───────────────────────────────────

async function migrateFromLocalStorage() {
  const STORAGE_KEY = "prompt-studio-tasks";
  try {
    // Ejecutar solo una vez: si ya migramos, salir inmediatamente.
    const alreadyMigrated = await db.settings.get("ls_migration_done");
    if (alreadyMigrated) return false;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Marcar como migrado aunque no haya nada que migrar,
      // para no volver a intentarlo en cada arranque.
      await db.settings.put({ key: "ls_migration_done", value: true });
      return false;
    }

    const tasks = JSON.parse(stored);
    if (!Array.isArray(tasks) || tasks.length === 0) {
      await db.settings.put({ key: "ls_migration_done", value: true });
      return false;
    }

    const normalized = tasks.map((task) => {
      const base = {
        ...task,
        createdAt:
          typeof task.createdAt === "string"
            ? new Date(task.createdAt).getTime()
            : task.createdAt || Date.now(),
        updatedAt:
          typeof task.updatedAt === "string"
            ? new Date(task.updatedAt).getTime()
            : task.updatedAt || Date.now(),
      };
      return normalizeTask(base);
    });

    await db.tasks.bulkAdd(normalized);
    await db.settings.put({ key: "ls_migration_done", value: true });
    return true;
  } catch (error) {
    console.error("Error en migración desde localStorage:", error);
    return false;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDB() {
  try {
    await db.open();
    await migrateFromLocalStorage();
    return true;
  } catch (error) {
    console.error("Error al abrir IndexedDB:", error);
    return false;
  }
}
