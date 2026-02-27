import { ref, watch, onMounted, onUnmounted } from "vue";
import { db, Task, initDB, normalizeTask } from "../db/db";
import { supabase } from "../supabase/supabaseClient";

const tasks = ref([]);
const currentTask = ref(null);
const promptText = ref("");

// Array de slots de media para la tarea activa.
// Cada slot: { url_post: string, url_video: string }
// Siempre tiene al menos un elemento (el slot por defecto).
const mediaList = ref([{ url_post: "", url_video: "" }]);

let initialized = false;
let saveTimeout = null;

// Helper: serializa mediaList a objeto plano seguro para Dexie (sin proxies Vue)
const serializeMedia = () =>
  mediaList.value.map((m) => ({
    url_post: m.url_post || "",
    url_video: m.url_video || "",
  }));

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
    if (!initialized) {
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
      window.addEventListener("create-default-task", async () => {
        await createNewTask();
      });

      // Auto-guardado con debounce 500ms
      watch(promptText, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => saveCurrentTask(), 500);
        }
      });

      // Watch profundo sobre mediaList para detectar cambios en cualquier slot
      watch(
        mediaList,
        () => {
          if (currentTask.value) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveCurrentTask(), 500);
          }
        },
        { deep: true },
      );
    }
  });

  const getTable = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session ? "tasks_auth" : "tasks_local";
  };

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

      // Normalizar al vuelo por si hay tareas en formato v2 que no pasaron por la migración
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

  const saveCurrentTask = async () => {
    if (!currentTask.value) return;

    try {
      const tableName = await getTable();

      currentTask.value.prompt = promptText.value;
      currentTask.value.media = serializeMedia();
      currentTask.value.updatedAt = Date.now();

      // JSON.parse/stringify para garantizar objeto plano sin Proxies de Vue
      const taskToSave = JSON.parse(
        JSON.stringify({
          id: currentTask.value.id,
          name: currentTask.value.name,
          prompt: currentTask.value.prompt,
          media: serializeMedia(),
          createdAt: currentTask.value.createdAt,
          updatedAt: currentTask.value.updatedAt,
        }),
      );

      await db[tableName].put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }
    } catch (error) {
      console.error("Error guardando tarea:", error);
    }
  };

  const updateTaskName = async (name) => {
    if (!currentTask.value) return;

    try {
      const tableName = await getTable();
      currentTask.value.name = name;
      currentTask.value.updatedAt = Date.now();

      const taskToSave = JSON.parse(
        JSON.stringify({
          id: currentTask.value.id,
          name: currentTask.value.name,
          prompt: currentTask.value.prompt,
          media: serializeMedia(),
          createdAt: currentTask.value.createdAt,
          updatedAt: currentTask.value.updatedAt,
        }),
      );

      await db[tableName].put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }
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

  // Actualiza un slot específico del mediaList activo.
  // Llamado por VideoPreview cuando el usuario extrae un video o escribe una URL.
  const updateMediaSlot = async (index, { url_post, url_video }) => {
    if (index >= 0 && index < mediaList.value.length) {
      mediaList.value[index] = { url_post, url_video };
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveCurrentTask(), 500);
    }
  };

  // Agrega un nuevo slot vacío al final. Guarda inmediatamente sin esperar el debounce.
  const addMediaSlot = async () => {
    mediaList.value.push({ url_post: "", url_video: "" });
    await saveCurrentTask();
  };

  // Elimina el slot en el índice dado. Guarda inmediatamente.
  // Protegido: nunca borra si solo queda uno.
  const removeMediaSlot = async (index) => {
    if (mediaList.value.length <= 1) return;
    mediaList.value.splice(index, 1);
    await saveCurrentTask();
  };

  // Usado por AlbumModal para upgrade a HD de un slot específico.
  // mediaIndex: qué slot de media actualizar (default 0 para compatibilidad).
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

      const taskToSave = JSON.parse(
        JSON.stringify({
          id: normalizedTask.id,
          name: normalizedTask.name,
          prompt: normalizedTask.prompt,
          media: normalizedTask.media,
          createdAt: normalizedTask.createdAt,
          updatedAt: normalizedTask.updatedAt,
        }),
      );

      await db[tableName].put(taskToSave);

      // Actualizar tasks[] en memoria
      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) tasks.value[index] = normalizedTask;

      // Si es la tarea activa, actualizar también mediaList
      if (currentTask.value?.id === taskId) {
        if (mediaList.value[mediaIndex]) {
          mediaList.value[mediaIndex] = {
            ...mediaList.value[mediaIndex],
            url_video,
          };
        }
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
