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

// v3: agrega soporte para media como array de slots {url_post, url_video}
db.version(3).stores({
  tasks_local: "id, name, createdAt, updatedAt",
  tasks_auth: "id, name, createdAt, updatedAt",
  settings: "key",
});

// Normaliza cualquier tarea al formato actual.
// Garantiza que media sea siempre un array con al menos un slot.
export function normalizeTask(raw) {
  return {
    ...raw,
    media:
      Array.isArray(raw.media) && raw.media.length > 0
        ? raw.media
        : [{ url_post: "", url_video: "" }],
  };
}

export class Task {
  constructor(data = {}) {
    this.id = data.id || Math.floor(Date.now() + Math.random() * 1000);
    this.name = data.name || "Nueva Tarea";
    this.prompt = data.prompt || "Escribe tu prompt aquí.";
    this.media =
      Array.isArray(data.media) && data.media.length > 0
        ? data.media
        : [{ url_post: "", url_video: "" }];
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }
}

export async function migrateFromLocalStorage() {
  const STORAGE_KEY = "prompt-studio-tasks";

  try {
    const existingLocalTasks = await db.tasks_local.count();
    if (existingLocalTasks > 0) return false;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const tasks = JSON.parse(stored);
    if (!Array.isArray(tasks) || tasks.length === 0) return false;

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

    await db.tasks_local.bulkAdd(normalized);
    return true;
  } catch (error) {
    console.error("Error en migración desde localStorage:", error);
    return false;
  }
}

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
