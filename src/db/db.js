import Dexie from "dexie";

export const db = new Dexie("PromptStudioDB");

// Versión 1 (legacy - para migración)
db.version(1).stores({
  tasks: "id, name, createdAt, updatedAt",
  settings: "key",
});

// Versión 2 (nueva arquitectura con dos tablas)
db.version(2)
  .stores({
    tasks: null, // Eliminar tabla antigua
    tasks_local: "id, name, createdAt, updatedAt", // Tareas offline (persisten siempre)
    tasks_auth: "id, name, createdAt, updatedAt", // Tareas autenticadas (se limpian al logout)
    settings: "key",
  })
  .upgrade(async (tx) => {
    // Migrar datos de 'tasks' antigua a 'tasks_local'
    const oldTasks = await tx.table("tasks").toArray();
    if (oldTasks.length > 0) {
      await tx.table("tasks_local").bulkAdd(oldTasks);
      console.log(`✅ Migrados ${oldTasks.length} tareas de v1 → tasks_local`);
    }
  });

export class Task {
  constructor(data = {}) {
    this.id = data.id || Math.floor(Date.now() + Math.random() * 1000);
    this.name = data.name || "Nueva Tarea";
    this.prompt =
      data.prompt ||
      "Escribe tu prompt aquí. Usa {color} o {color:nombre} para colores dinámicos.";
    this.colors = data.colors || {};
    this.url_post = data.url_post || "";
    this.url_video = data.url_video || "";
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

export async function migrateFromLocalStorage() {
  const STORAGE_KEY = "prompt-studio-tasks";

  try {
    // Verificar si ya hay datos en tasks_local (nueva arquitectura)
    const existingLocalTasks = await db.tasks_local.count();
    if (existingLocalTasks > 0) {
      console.log("✅ tasks_local ya tiene datos");
      return false;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("ℹ️ No hay datos en localStorage");
      return false;
    }

    const tasks = JSON.parse(stored);

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return false;
    }

    // Migrar a tasks_local (datos offline)
    await db.tasks_local.bulkAdd(tasks);
    console.log(
      `✅ Migrados ${tasks.length} tareas desde localStorage → tasks_local`,
    );

    return true;
  } catch (error) {
    console.error("❌ Error en migración:", error);
    return false;
  }
}

export async function initDB() {
  try {
    await db.open();
    console.log("✅ IndexedDB inicializada");
    await migrateFromLocalStorage();
    return true;
  } catch (error) {
    console.error("❌ Error al abrir IndexedDB:", error);
    return false;
  }
}
