import { ref, watch, onMounted, onUnmounted } from "vue";
import { db, Task, initDB, normalizeTask } from "../db/db";
import { supabase } from "../supabase/supabaseClient";

// ─── Estado singleton de módulo ───────────────────────────────────────────────

const tasks = ref([]);
const currentTask = ref(null);
const promptText = ref("");

// Array de slots de media para la tarea activa.
// Cada slot: { url_post: string, url_video: string }
// Siempre tiene al menos un elemento (el slot por defecto).
const mediaList = ref([{ url_post: "", url_video: "" }]);

let initialized = false;
let saveTimeout = null;

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Serializa mediaList a objeto plano seguro para Dexie (sin Proxies Vue) */
const serializeMedia = () =>
  mediaList.value.map((m) => ({
    url_post: m.url_post || "",
    url_video: m.url_video || "",
  }));

/** Devuelve el nombre de la tabla según si hay sesión activa o no */
const getTable = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? "tasks_auth" : "tasks_local";
};

/**
 * Construye el objeto plano que se persiste en Dexie.
 * Usa JSON.parse/stringify para eliminar Proxies de Vue.
 */
const buildTaskPayload = (task, media) =>
  JSON.parse(
    JSON.stringify({
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      media,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }),
  );

/**
 * Persiste currentTask con los valores actuales de promptText y mediaList,
 * y sincroniza el array tasks[] en memoria.
 */
const persistCurrentTask = async () => {
  if (!currentTask.value) return;

  const tableName = await getTable();
  const media = serializeMedia();

  currentTask.value.prompt = promptText.value;
  currentTask.value.media = media;
  currentTask.value.updatedAt = Date.now();

  const payload = buildTaskPayload(currentTask.value, media);
  await db[tableName].put(payload);

  const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
  if (index !== -1) tasks.value[index] = { ...currentTask.value };
};

// ─── Watchers de auto-guardado ────────────────────────────────────────────────
// Se registran a nivel de módulo (una sola vez, fuera de cualquier onMounted)
// para que no estén vinculados al ciclo de vida de ningún componente.
//
// Si estuvieran dentro de onMounted, morirían cuando el primer componente
// que los registró se desmonte, dejando el auto-guardado inactivo para el resto.
//
// Llamamos a persistCurrentTask (nivel módulo) en lugar de saveCurrentTask
// (nivel composable) porque los watch() se definen antes de que el composable
// sea instanciado y saveCurrentTask no existe aún en este scope.

const scheduleSave = () => {
  if (!currentTask.value) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(persistCurrentTask, 500);
};

watch(promptText, scheduleSave);
watch(mediaList, scheduleSave, { deep: true });

// ─── Composable ──────────────────────────────────────────────────────────────

export function usePromptManager() {
  const clearLocalData = async () => {
    try {
      await db.tasks_auth.clear();
      tasks.value = [];
      currentTask.value = null;
      promptText.value = "";
      mediaList.value = [{ url_post: "", url_video: "" }];
    } catch (error) {
      console.error("Error limpiando datos de sesión:", error);
    }
  };

  onMounted(async () => {
    if (initialized) return;
    initialized = true;

    await initDB();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      await loadTasks();
    }

    window.addEventListener("user-signed-out", clearLocalData);
    window.addEventListener("data-restored", reloadTasks);
    window.addEventListener("create-default-task", createNewTask);
  });

  const loadTasks = async (skipIfEmpty = false) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let tableName;

      if (session) {
        tableName = "tasks_auth";
      } else {
        tableName = "tasks_local";
        const authTasksCount = await db.tasks_auth.count();
        if (authTasksCount > 0) {
          console.warn("Datos huérfanos en tasks_auth detectados — limpiando");
          await db.tasks_auth.clear();
        }
      }

      const allTasks = await db[tableName]
        .orderBy("updatedAt")
        .reverse()
        .toArray();

      // Normalizar al vuelo por si hay tareas en formato v2 sin migración
      tasks.value = allTasks.map(normalizeTask);

      if (tasks.value.length > 0) {
        await loadTask(tasks.value[0]);
      } else if (!skipIfEmpty) {
        await createNewTask();
      }
    } catch (error) {
      console.error("Error cargando tareas:", error);
      if (!skipIfEmpty) await createNewTask();
    }
  };

  const createNewTask = async () => {
    try {
      const tableName = await getTable();
      const newTask = new Task({
        name: "Nueva Tarea",
        prompt: "Escribe tu prompt aquí.",
      });
      await db[tableName].add(newTask);
      tasks.value.unshift(newTask);
      await loadTask(newTask);
      return newTask;
    } catch (error) {
      console.error("Error creando tarea:", error);
      throw error;
    }
  };

  const loadTask = async (task) => {
    const normalized = normalizeTask(task);
    currentTask.value = normalized;
    promptText.value = normalized.prompt;
    // Copia profunda para evitar mutar directamente el objeto en tasks[]
    mediaList.value = normalized.media.map((m) => ({ ...m }));
  };

  /** Guarda el estado actual de promptText y mediaList en la tarea activa */
  const saveCurrentTask = async () => {
    try {
      await persistCurrentTask();
    } catch (error) {
      console.error("Error guardando tarea:", error);
    }
  };

  const updateTaskName = async (name) => {
    if (!currentTask.value) return;
    try {
      currentTask.value.name = name;
      currentTask.value.updatedAt = Date.now();
      await persistCurrentTask();
    } catch (error) {
      console.error("Error actualizando nombre:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const tableName = await getTable();
      await db[tableName].delete(taskId);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) tasks.value.splice(index, 1);

      if (currentTask.value?.id === taskId) {
        if (tasks.value.length > 0) {
          await loadTask(tasks.value[0]);
        } else {
          await createNewTask();
        }
      }
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    }
  };

  const deleteAllTasks = async () => {
    try {
      const tableName = await getTable();
      await db[tableName].clear();
      tasks.value = [];
      await createNewTask();
    } catch (error) {
      console.error("Error eliminando todas las tareas:", error);
      throw error;
    }
  };

  const duplicateTask = async (task) => {
    try {
      const tableName = await getTable();
      const normalized = normalizeTask(task);

      const duplicate = new Task({
        name: `${normalized.name} (copia)`,
        prompt: normalized.prompt,
        media: normalized.media.map((m) => ({ ...m })),
      });

      await db[tableName].add(duplicate);
      tasks.value.unshift(duplicate);
      return duplicate;
    } catch (error) {
      console.error("Error duplicando tarea:", error);
      throw error;
    }
  };

  const exportTasks = async () => {
    try {
      const tableName = await getTable();
      const allTasks = await db[tableName].toArray();

      const data = {
        version: "3.0.0",
        exportedAt: Date.now(),
        source: tableName,
        tasks: allTasks.map(normalizeTask),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prompt-tasks-${tableName}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exportando tareas:", error);
    }
  };

  const importTasks = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.tasks || !Array.isArray(data.tasks)) {
            reject(new Error("Formato de archivo inválido"));
            return;
          }

          const tableName = await getTable();
          const baseId = Date.now();

          const newTasks = data.tasks.map((task, index) => ({
            id: baseId + index,
            name: task.name || "Tarea importada",
            prompt: task.prompt || "",
            media:
              Array.isArray(task.media) && task.media.length > 0
                ? task.media
                : [{ url_post: "", url_video: "" }],
            createdAt: task.createdAt || Date.now(),
            updatedAt: task.updatedAt || Date.now(),
          }));

          await db[tableName].bulkAdd(newTasks);
          tasks.value.push(...newTasks);
          resolve(newTasks.length);
        } catch (error) {
          console.error("Error importando tareas:", error);
          reject(new Error(`Error al importar: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });
  };

  // ─── Gestión de slots de media ────────────────────────────────────────────

  /** Actualiza un slot específico. Llamado por VideoPreview al extraer un video. */
  const updateMediaSlot = async (index, { url_post, url_video }) => {
    if (index < 0 || index >= mediaList.value.length) return;
    mediaList.value[index] = { url_post, url_video };
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCurrentTask, 500);
  };

  /** Agrega un slot vacío al final y guarda de inmediato. */
  const addMediaSlot = async () => {
    mediaList.value.push({ url_post: "", url_video: "" });
    await saveCurrentTask();
  };

  /** Elimina el slot en el índice dado. Protegido: nunca borra si solo queda uno. */
  const removeMediaSlot = async (index) => {
    if (mediaList.value.length <= 1) return;
    mediaList.value.splice(index, 1);
    await saveCurrentTask();
  };

  /**
   * Actualiza la url_video de un slot específico de cualquier tarea.
   * Usado por AlbumModal para upgrade a HD.
   * mediaIndex: índice del slot a actualizar (default 0).
   */
  const updateTaskVideoUrl = async (taskId, url_video, mediaIndex = 0) => {
    try {
      const tableName = await getTable();
      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) {
        console.warn(`Tarea no encontrada: ${taskId}`);
        return;
      }

      const normalizedTask = normalizeTask(task);
      if (!normalizedTask.media[mediaIndex]) return;

      normalizedTask.media[mediaIndex] = {
        ...normalizedTask.media[mediaIndex],
        url_video,
      };
      normalizedTask.updatedAt = Date.now();

      const payload = buildTaskPayload(normalizedTask, normalizedTask.media);
      await db[tableName].put(payload);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) tasks.value[index] = normalizedTask;

      // Si es la tarea activa, reflejar el cambio en mediaList
      if (currentTask.value?.id === taskId && mediaList.value[mediaIndex]) {
        mediaList.value[mediaIndex] = {
          ...mediaList.value[mediaIndex],
          url_video,
        };
      }
    } catch (error) {
      console.error("Error actualizando URL de video:", error);
    }
  };

  const reloadTasks = async () => {
    await loadTasks();
  };

  onUnmounted(() => {
    window.removeEventListener("user-signed-out", clearLocalData);
    window.removeEventListener("data-restored", reloadTasks);
    window.removeEventListener("create-default-task", createNewTask);
  });

  return {
    tasks,
    currentTask,
    promptText,
    mediaList,
    createNewTask,
    loadTask,
    loadTasks,
    saveCurrentTask,
    updateTaskName,
    deleteTask,
    deleteAllTasks,
    duplicateTask,
    exportTasks,
    importTasks,
    updateMediaSlot,
    addMediaSlot,
    removeMediaSlot,
    updateTaskVideoUrl,
    clearLocalData,
    reloadTasks,
  };
}
