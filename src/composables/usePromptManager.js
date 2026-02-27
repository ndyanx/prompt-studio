import { ref, watch, onMounted, onUnmounted } from "vue";
import { db, Task, initDB } from "../db/db";
import { supabase } from "../supabase/supabaseClient";

const tasks = ref([]);
const currentTask = ref(null);
const promptText = ref("");
const urlPost = ref("");
const urlVideo = ref("");

let initialized = false;
let saveTimeout = null;

export function usePromptManager() {
  // Limpia únicamente tasks_auth al cerrar sesión.
  // tasks_local no se toca — esos datos persisten offline.
  const clearLocalData = async () => {
    try {
      await db.tasks_auth.clear();

      tasks.value = [];
      currentTask.value = null;
      promptText.value = "";
      urlPost.value = "";
      urlVideo.value = "";
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
        // Sin sesión activa: cargar tareas offline inmediatamente
        await loadTasks();
      }
      // Con sesión activa: useSyncManager restaura los datos desde Supabase
      // y emite 'data-restored', que dispara reloadTasks()

      window.addEventListener("user-signed-out", clearLocalData);
      window.addEventListener("data-restored", reloadTasks);
      window.addEventListener("create-default-task", async () => {
        await createNewTask();
      });

      // Auto-guardado con debounce de 500ms al editar cualquier campo
      watch(promptText, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => saveCurrentTask(), 500);
        }
      });

      watch(urlPost, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => saveCurrentTask(), 500);
        }
      });

      watch(urlVideo, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => saveCurrentTask(), 500);
        }
      });
    }
  });

  // Determina qué tabla usar según el estado de la sesión:
  // autenticado → tasks_auth, offline → tasks_local
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

        // Si hay datos en tasks_auth sin sesión activa, son huérfanos (ej. localStorage borrado)
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

      tasks.value = allTasks;

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

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
    currentTask.value = task;
    promptText.value = task.prompt;
    urlPost.value = task.url_post || "";
    urlVideo.value = task.url_video || "";
  };

  const saveCurrentTask = async () => {
    if (!currentTask.value) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

      currentTask.value.prompt = promptText.value;
      currentTask.value.url_post = urlPost.value;
      currentTask.value.url_video = urlVideo.value;
      currentTask.value.updatedAt = Date.now();

      // Se serializa a un objeto plano para evitar problemas con los proxies de Vue en Dexie
      const taskToSave = {
        id: currentTask.value.id,
        name: currentTask.value.name,
        prompt: currentTask.value.prompt,
        url_post: currentTask.value.url_post,
        url_video: currentTask.value.url_video,
        createdAt: currentTask.value.createdAt,
        updatedAt: currentTask.value.updatedAt,
      };

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

      currentTask.value.name = name;
      currentTask.value.updatedAt = Date.now();

      const taskToSave = {
        id: currentTask.value.id,
        name: currentTask.value.name,
        prompt: currentTask.value.prompt,
        url_post: currentTask.value.url_post || "",
        url_video: currentTask.value.url_video || "",
        createdAt: currentTask.value.createdAt,
        updatedAt: currentTask.value.updatedAt,
      };

      await db[tableName].put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }
    } catch (error) {
      console.error("Error actualizando nombre de tarea:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

      const duplicate = new Task({
        name: `${task.name} (copia)`,
        prompt: task.prompt,
        url_post: task.url_post || "",
        url_video: task.url_video || "",
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

      const allTasks = await db[tableName].toArray();

      const data = {
        version: "2.0.0",
        exportedAt: Date.now(),
        source: tableName,
        tasks: allTasks,
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

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const tableName = session ? "tasks_auth" : "tasks_local";

          // Se generan IDs nuevos para evitar colisiones con tareas existentes
          const baseId = Date.now();
          const newTasks = data.tasks.map((task, index) => ({
            id: baseId + index,
            name: task.name || "Tarea importada",
            prompt: task.prompt || "",
            url_post: task.url_post || "",
            url_video: task.url_video || "",
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

  const updateVideoUrls = ({ url_post, url_video }) => {
    urlPost.value = url_post;
    urlVideo.value = url_video;
  };

  // Actualiza la URL de video de una tarea específica sin afectar otros campos.
  // Usado por AlbumModal cuando se hace upgrade a versión HD.
  const updateTaskVideoUrl = async (taskId, url_video) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tableName = session ? "tasks_auth" : "tasks_local";

      const task = tasks.value.find((t) => t.id === taskId);
      if (!task) {
        console.warn(`Tarea no encontrada: ${taskId}`);
        return;
      }

      task.url_video = url_video;
      task.updatedAt = Date.now();

      const taskToSave = {
        id: task.id,
        name: task.name,
        prompt: task.prompt,
        url_post: task.url_post,
        url_video: url_video,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      await db[tableName].put(taskToSave);

      if (currentTask.value?.id === taskId) {
        urlVideo.value = url_video;
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
    urlPost,
    urlVideo,
    createNewTask,
    loadTask,
    saveCurrentTask,
    updateTaskName,
    deleteTask,
    deleteAllTasks,
    duplicateTask,
    exportTasks,
    importTasks,
    updateVideoUrls,
    updateTaskVideoUrl,
    clearLocalData,
    reloadTasks,
  };
}
