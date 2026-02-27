import Dexie from "dexie";

export const db = new Dexie("PromptStudioDB");

// v1: schema original, se mantiene para la migración automática de Dexie
db.version(1).stores({
  tasks: "id, name, createdAt, updatedAt",
  settings: "key",
});

// v2: arquitectura de dos tablas separadas por tipo de sesión
// - tasks_local: tareas offline, persisten siempre independientemente de la sesión
// - tasks_auth: tareas del usuario autenticado, se limpian al cerrar sesión
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

export class Task {
  constructor(data = {}) {
    this.id = data.id || Math.floor(Date.now() + Math.random() * 1000);
    this.name = data.name || "Nueva Tarea";
    this.prompt = data.prompt || "Escribe tu prompt aquí.";
    this.url_post = data.url_post || "";
    this.url_video = data.url_video || "";
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }
}

// Migra tareas guardadas en localStorage (formato antiguo) a tasks_local en IndexedDB.
// Solo se ejecuta si tasks_local está vacía, para no duplicar datos.
export async function migrateFromLocalStorage() {
  const STORAGE_KEY = "prompt-studio-tasks";

  try {
    const existingLocalTasks = await db.tasks_local.count();
    if (existingLocalTasks > 0) return false;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const tasks = JSON.parse(stored);
    if (!Array.isArray(tasks) || tasks.length === 0) return false;

    // Convertir fechas al nuevo formato numérico durante la migración
    const normalized = tasks.map((task) => ({
      ...task,
      createdAt:
        typeof task.createdAt === "string"
          ? new Date(task.createdAt).getTime()
          : task.createdAt || Date.now(),
      updatedAt:
        typeof task.updatedAt === "string"
          ? new Date(task.updatedAt).getTime()
          : task.updatedAt || Date.now(),
    }));

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
