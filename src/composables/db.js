import Dexie from "dexie";

export const db = new Dexie("PromptStudioDB");

db.version(1).stores({
  tasks: "id, name, createdAt, updatedAt",
  settings: "key",
});

export class Task {
  constructor(data = {}) {
    this.id = data.id || Math.floor(Date.now() + Math.random() * 1000);
    this.name = data.name || "Nueva Tarea";
    this.prompt =
      data.prompt ||
      "Escribe tu prompt aquí. Usa {color} o {color:nombre} para colores dinámicos.";
    this.colors = data.colors || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

export async function migrateFromLocalStorage() {
  const STORAGE_KEY = "prompt-studio-tasks";

  try {
    const existingTasks = await db.tasks.count();
    if (existingTasks > 0) {
      console.log("✅ IndexedDB ya tiene datos");
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

    await db.tasks.bulkAdd(tasks);
    console.log(`✅ Migrados ${tasks.length} tareas desde localStorage`);

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
