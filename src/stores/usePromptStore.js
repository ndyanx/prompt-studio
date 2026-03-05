import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { db, Task, initDB, normalizeTask, SYNC_OPERATIONS } from "../db/db";
import { useSyncStore } from "../stores/useSyncStore";
import { APP_EVENTS } from "../events/events";

export const usePromptStore = defineStore("prompt", () => {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const tasks = ref([]);
  const currentTask = ref(null);
  const promptText = ref("");
  const mediaList = ref([
    { url_post: "", url_video: "", width: null, height: null },
  ]);
  // true una vez que init() termina — App.vue muestra los paneles reales
  // solo cuando esto es true, previniendo CLS por datos asíncronos.
  const isReady = ref(false);
  // Error visible para la UI — se limpia en la siguiente operación exitosa.
  const storeError = ref(null);
  const setError = (msg, err) => {
    console.error(msg, err);
    storeError.value = msg;
  };
  const clearError = () => {
    storeError.value = null;
  };

  let saveTimeout = null;

  // Versión de carga: se incrementa en cada loadTask/realtimeChange.
  // scheduleSave captura el valor en el closure y lo compara al expirar;
  // si cambió, descarta el save para evitar race conditions.
  let restoreVersion = 0;

  // Referencia lazy al syncStore para evitar dependencia circular en imports.
  const getSync = () => useSyncStore();

  // ─── Helpers internos ─────────────────────────────────────────────────────

  const serializeMedia = () =>
    mediaList.value.map((m) => ({
      url_post: m.url_post || "",
      url_video: m.url_video || "",
      width: m.width || null,
      height: m.height || null,
    }));

  const buildTaskPayload = (task, media) =>
    structuredClone({
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      media,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });

  /**
   * Persiste currentTask en IndexedDB y dispara sync a Supabase.
   * El sync es fire-and-forget: la UI nunca espera la red.
   */
  const persistCurrentTask = async () => {
    if (!currentTask.value) return;

    const media = serializeMedia();
    currentTask.value.prompt = promptText.value;
    currentTask.value.media = media;
    currentTask.value.updatedAt = Date.now();

    const payload = buildTaskPayload(currentTask.value, media);

    await db.tasks.put(payload);

    const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
    if (index !== -1) tasks.value[index] = { ...currentTask.value };

    getSync().syncTaskToSupabase(payload, SYNC_OPERATIONS.UPSERT);
  };

  /**
   * Fix #4: helper unificado para persistir cualquier tarea del array tasks.
   * Evita repetir el trío db.put + tasks[index] + syncToSupabase en cada
   * función que modifica una tarea que no es currentTask.
   */
  const persistTaskById = async (normalizedTask) => {
    const payload = buildTaskPayload(normalizedTask, normalizedTask.media);
    await db.tasks.put(payload);
    const index = tasks.value.findIndex((t) => t.id === normalizedTask.id);
    if (index !== -1) tasks.value[index] = normalizedTask;
    getSync().syncTaskToSupabase(payload, SYNC_OPERATIONS.UPSERT);
    return payload;
  };

  // ─── Auto-guardado ────────────────────────────────────────────────────────

  const scheduleSave = () => {
    if (!currentTask.value) return;
    clearTimeout(saveTimeout);
    const versionAtSchedule = restoreVersion;
    saveTimeout = setTimeout(() => {
      if (restoreVersion !== versionAtSchedule) return;
      persistCurrentTask();
    }, 2000);
  };

  watch(promptText, scheduleSave);
  watch(mediaList, scheduleSave, { deep: true });

  // ─── Init ─────────────────────────────────────────────────────────────────

  const init = async () => {
    await initDB();
    await loadTasks();

    window.addEventListener(APP_EVENTS.SIGNED_OUT, clearLocalData);
    window.addEventListener(APP_EVENTS.DATA_RESTORED, loadTasks);
    window.addEventListener(APP_EVENTS.CREATE_DEFAULT_TASK, createNewTask);
    window.addEventListener(APP_EVENTS.REALTIME_CHANGE, handleRealtimeChange);

    isReady.value = true;
  };

  // ─── Realtime handler ─────────────────────────────────────────────────────

  const handleRealtimeChange = async () => {
    const allTasks = await db.tasks.orderBy("updatedAt").reverse().toArray();
    const normalized = allTasks.map(normalizeTask);
    tasks.value.splice(0, tasks.value.length, ...normalized);

    if (!currentTask.value) return;

    const updated = tasks.value.find((t) => t.id === currentTask.value.id);

    if (updated) {
      const prevUpdatedAt = currentTask.value.updatedAt;
      const prevPrompt = currentTask.value.prompt;
      const prevMedia = JSON.stringify(currentTask.value.media);
      currentTask.value = updated;

      // Comparar contenido, no solo updatedAt: los relojes entre dispositivos
      // pueden diferir y romper una comparación solo por timestamp.
      const contentChanged =
        updated.updatedAt > prevUpdatedAt ||
        updated.prompt !== prevPrompt ||
        JSON.stringify(updated.media) !== prevMedia;

      if (contentChanged) {
        restoreVersion++;
        promptText.value = updated.prompt;
        mediaList.value = updated.media.map((m) => ({ ...m }));
      }
    } else {
      // La tarea activa fue eliminada desde otro dispositivo
      if (tasks.value.length > 0) {
        await loadTask(tasks.value[0]);
      } else {
        await createNewTask();
      }
    }
  };

  // ─── Limpiar datos al cerrar sesión ───────────────────────────────────────

  const clearLocalData = async () => {
    // IndexedDB ya fue limpiado por useSyncStore en handleSignOut.
    // Aquí solo reseteamos el estado en memoria.
    tasks.value = [];
    currentTask.value = null;
    promptText.value = "";
    mediaList.value = [
      { url_post: "", url_video: "", width: null, height: null },
    ];
  };

  // ─── Carga de tareas ──────────────────────────────────────────────────────

  const loadTasks = async () => {
    try {
      const allTasks = await db.tasks.orderBy("updatedAt").reverse().toArray();
      tasks.value = allTasks.map(normalizeTask);

      if (tasks.value.length > 0) {
        await loadTask(tasks.value[0]);
      } else {
        await createNewTask();
      }
    } catch (error) {
      setError("Error cargando tareas", error);
      await createNewTask();
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const createNewTask = async () => {
    try {
      const newTask = new Task({
        name: "Nueva Tarea",
        prompt: "Escribe tu prompt aquí.",
      });

      await db.tasks.add(newTask);
      tasks.value.unshift(newTask);
      await loadTask(newTask);
      getSync().syncTaskToSupabase(newTask, SYNC_OPERATIONS.UPSERT);

      return newTask;
    } catch (error) {
      setError("Error creando tarea", error);
      throw error;
    }
  };

  const loadTask = async (task) => {
    const normalized = normalizeTask(task);
    restoreVersion++;
    currentTask.value = normalized;
    promptText.value = normalized.prompt;
    mediaList.value = normalized.media.map((m) => ({ ...m }));
  };

  const updateTaskName = async (name) => {
    if (!currentTask.value) return;
    currentTask.value.name = name;
    currentTask.value.updatedAt = Date.now();
    scheduleSave();
  };

  const deleteTask = async (taskId) => {
    try {
      const taskToDelete = tasks.value.find((t) => t.id === taskId);

      await db.tasks.delete(taskId);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) tasks.value.splice(index, 1);

      if (taskToDelete) {
        getSync().syncTaskToSupabase(taskToDelete, SYNC_OPERATIONS.DELETE);
      }

      if (currentTask.value?.id === taskId) {
        if (tasks.value.length > 0) {
          await loadTask(tasks.value[0]);
        } else {
          await createNewTask();
        }
      }
    } catch (error) {
      setError("Error eliminando tarea", error);
    }
  };

  const deleteAllTasks = async () => {
    try {
      const allTasks = await db.tasks.toArray();

      await db.tasks.clear();
      tasks.value = [];

      const sync = getSync();
      for (const task of allTasks) {
        sync.syncTaskToSupabase(task, SYNC_OPERATIONS.DELETE);
      }

      await createNewTask();
    } catch (error) {
      setError("Error eliminando todas las tareas", error);
      throw error;
    }
  };

  const duplicateTask = async (task) => {
    try {
      const normalized = normalizeTask(task);
      const duplicate = new Task({
        name: `${normalized.name} (copia)`,
        prompt: normalized.prompt,
        media: normalized.media.map((m) => ({ ...m })),
      });

      await db.tasks.add(duplicate);
      tasks.value.unshift(duplicate);
      getSync().syncTaskToSupabase(duplicate, SYNC_OPERATIONS.UPSERT);

      return duplicate;
    } catch (error) {
      setError("Error duplicando tarea", error);
      throw error;
    }
  };

  // ─── Export / Import ──────────────────────────────────────────────────────

  const exportTasks = async () => {
    try {
      const allTasks = await db.tasks.toArray();
      const data = {
        version: "4.0.0",
        exportedAt: Date.now(),
        tasks: allTasks.map(normalizeTask),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prompt-tasks-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError("Error exportando tareas", error);
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

          // Fix #6: crypto.randomUUID() nativo — evita colisiones que
          // Date.now() + index puede generar en bulk operations rápidas.
          const newTasks = data.tasks.map((task) => ({
            id: crypto.randomUUID(),
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

          // bulkPut (upsert) evita BulkError si Realtime escribe en paralelo.
          await db.tasks.bulkPut(newTasks);
          tasks.value.push(...newTasks);

          const sync = getSync();
          for (const task of newTasks) {
            sync.syncTaskToSupabase(task, SYNC_OPERATIONS.UPSERT);
          }

          clearError();
          resolve(newTasks.length);
        } catch (error) {
          setError("Error importando tareas", error);
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
    scheduleSave();
  };

  const addMediaSlot = async () => {
    mediaList.value.push({
      url_post: "",
      url_video: "",
      width: null,
      height: null,
    });
    await persistCurrentTask();
  };

  const removeMediaSlot = async (index) => {
    if (mediaList.value.length <= 1) return;
    mediaList.value.splice(index, 1);
    await persistCurrentTask();
  };

  const updateTaskVideoUrl = async (taskId, url_video, mediaIndex = 0) => {
    try {
      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) return;

      const normalizedTask = normalizeTask(task);
      if (!normalizedTask.media[mediaIndex]) return;

      normalizedTask.media[mediaIndex] = {
        ...normalizedTask.media[mediaIndex],
        url_video,
      };
      normalizedTask.updatedAt = Date.now();

      await persistTaskById(normalizedTask);

      if (currentTask.value?.id === taskId && mediaList.value[mediaIndex]) {
        mediaList.value[mediaIndex] = {
          ...mediaList.value[mediaIndex],
          url_video,
        };
      }
    } catch (error) {
      setError("Error actualizando URL de video", error);
    }
  };

  const updateMediaDimensions = async (taskId, slotIndex, width, height) => {
    try {
      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) return;

      const normalizedTask = normalizeTask(task);
      if (!normalizedTask.media[slotIndex]) return;

      const slot = normalizedTask.media[slotIndex];
      if (slot.width === width && slot.height === height) return;

      normalizedTask.media[slotIndex] = { ...slot, width, height };
      // updatedAt no cambia: las dimensiones son metadatos de runtime

      await persistTaskById(normalizedTask);

      if (currentTask.value?.id === taskId && mediaList.value[slotIndex]) {
        mediaList.value[slotIndex] = {
          ...mediaList.value[slotIndex],
          width,
          height,
        };
      }
    } catch (error) {
      setError("Error guardando dimensiones", error);
    }
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = () => {
    window.removeEventListener(APP_EVENTS.SIGNED_OUT, clearLocalData);
    window.removeEventListener(APP_EVENTS.DATA_RESTORED, loadTasks);
    window.removeEventListener(APP_EVENTS.CREATE_DEFAULT_TASK, createNewTask);
    window.removeEventListener(
      APP_EVENTS.REALTIME_CHANGE,
      handleRealtimeChange,
    );
  };

  return {
    tasks,
    currentTask,
    promptText,
    mediaList,
    isReady,
    storeError,
    init,
    clearLocalData,
    loadTasks,
    createNewTask,
    loadTask,
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
    cleanup,
  };
});
