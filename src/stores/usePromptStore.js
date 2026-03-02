import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { db, Task, initDB, normalizeTask } from "../db/db";
import { supabase } from "../supabase/supabaseClient";

export const usePromptStore = defineStore("prompt", () => {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const tasks = ref([]);
  const currentTask = ref(null);
  const promptText = ref("");

  // Array de slots de media para la tarea activa.
  // Cada slot: { url_post: string, url_video: string, width: number|null, height: number|null }
  // Siempre tiene al menos un elemento.
  const mediaList = ref([
    { url_post: "", url_video: "", width: null, height: null },
  ]);

  let saveTimeout = null;

  // ─── Helpers internos ─────────────────────────────────────────────────────

  /** Serializa mediaList a objeto plano seguro para Dexie (sin Proxies Vue) */
  const serializeMedia = () =>
    mediaList.value.map((m) => ({
      url_post: m.url_post || "",
      url_video: m.url_video || "",
      width: m.width || null,
      height: m.height || null,
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

  // ─── Auto-guardado ────────────────────────────────────────────────────────
  // Los watchers van dentro del store. Pinia los registra correctamente
  // y los mantiene activos mientras el store exista (toda la vida de la app).

  const scheduleSave = () => {
    if (!currentTask.value) return;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persistCurrentTask, 500);
  };

  watch(promptText, scheduleSave);
  watch(mediaList, scheduleSave, { deep: true });

  // ─── Actions ──────────────────────────────────────────────────────────────

  const init = async () => {
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
  };

  const clearLocalData = async () => {
    try {
      await db.tasks_auth.clear();
      tasks.value = [];
      currentTask.value = null;
      promptText.value = "";
      mediaList.value = [
        { url_post: "", url_video: "", width: null, height: null },
      ];
    } catch (error) {
      console.error("Error limpiando datos de sesión:", error);
    }
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
    mediaList.value = normalized.media.map((m) => ({ ...m }));
  };

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
                ? task.media.map((m) => ({
                    url_post: m.url_post || "",
                    url_video: m.url_video || "",
                    width: m.width || null,
                    height: m.height || null,
                  }))
                : [{ url_post: "", url_video: "", width: null, height: null }],
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

  const updateMediaSlot = async (
    index,
    { url_post, url_video, width = null, height = null },
  ) => {
    if (index < 0 || index >= mediaList.value.length) return;
    mediaList.value[index] = { url_post, url_video, width, height };
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCurrentTask, 500);
  };

  const addMediaSlot = async () => {
    mediaList.value.push({
      url_post: "",
      url_video: "",
      width: null,
      height: null,
    });
    await saveCurrentTask();
  };

  const removeMediaSlot = async (index) => {
    if (mediaList.value.length <= 1) return;
    mediaList.value.splice(index, 1);
    await saveCurrentTask();
  };

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

  /**
   * Persiste width/height de un slot cuando se descubren en runtime
   * (videos que no tenían dimensiones en el JSON importado).
   * No modifica updatedAt ni dispara autosave.
   */
  const updateMediaDimensions = async (taskId, slotIndex, width, height) => {
    try {
      const tableName = await getTable();
      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) return;

      const normalizedTask = normalizeTask(task);
      if (!normalizedTask.media[slotIndex]) return;

      // Si ya tiene los mismos valores no hacemos nada
      const slot = normalizedTask.media[slotIndex];
      if (slot.width === width && slot.height === height) return;

      normalizedTask.media[slotIndex] = { ...slot, width, height };

      const payload = buildTaskPayload(normalizedTask, normalizedTask.media);
      await db[tableName].put(payload);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) tasks.value[index] = normalizedTask;

      if (currentTask.value?.id === taskId && mediaList.value[slotIndex]) {
        mediaList.value[slotIndex] = {
          ...mediaList.value[slotIndex],
          width,
          height,
        };
      }
    } catch (error) {
      console.error("Error guardando dimensiones:", error);
    }
  };

  const reloadTasks = async () => {
    await loadTasks();
  };

  const cleanup = () => {
    window.removeEventListener("user-signed-out", clearLocalData);
    window.removeEventListener("data-restored", reloadTasks);
    window.removeEventListener("create-default-task", createNewTask);
  };

  return {
    // Estado
    tasks,
    currentTask,
    promptText,
    mediaList,
    // Actions
    init,
    clearLocalData,
    loadTasks,
    createNewTask,
    loadTask,
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
    updateMediaDimensions,
    reloadTasks,
    cleanup,
  };
});
