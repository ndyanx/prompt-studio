import { ref, reactive, computed, watch, onMounted, shallowRef } from "vue";
import { db, Task, initDB } from "./db";

const tasks = ref([]);
const currentTask = ref(null);
const promptText = ref("");
const colorSelections = reactive({});
const urlPost = ref("");
const urlVideo = ref("");

let initialized = false;
let saveTimeout = null;

export function usePromptManager() {
  onMounted(async () => {
    if (!initialized) {
      initialized = true;
      await initDB();
      await loadTasks();

      // Watches separados en lugar de un watch deep
      // Cada uno observa solo lo que necesita

      watch(promptText, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            saveCurrentTask();
          }, 500);
        }
      });

      watch(urlPost, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            saveCurrentTask();
          }, 500);
        }
      });

      watch(urlVideo, () => {
        if (currentTask.value) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            saveCurrentTask();
          }, 500);
        }
      });

      // Para colorSelections, observar solo cuando cambian los valores
      // Usamos JSON.stringify para detectar cambios reales
      watch(
        () => JSON.stringify(colorSelections),
        () => {
          if (currentTask.value) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
              saveCurrentTask();
            }, 500);
          }
        },
      );
    }
  });

  const lastPromptText = ref("");
  const cachedParsedColors = shallowRef([]);

  const parsedColors = computed(() => {
    // Si el prompt no cambió, retornar cache
    if (promptText.value === lastPromptText.value) {
      return cachedParsedColors.value;
    }

    const regex = /\{color(?::([^}]+))?\}/g;
    const matches = [];
    let match;
    let index = 1;

    while ((match = regex.exec(promptText.value)) !== null) {
      const name = match[1] || `Color ${index}`;
      const key = `color_${index}`;
      matches.push({
        key,
        name,
        placeholder: match[0],
        index,
      });

      if (!colorSelections[key]) {
        colorSelections[key] = "SlateGray";
      }

      index++;
    }

    const validKeys = matches.map((m) => m.key);
    Object.keys(colorSelections).forEach((key) => {
      if (!validKeys.includes(key)) {
        delete colorSelections[key];
      }
    });

    // Actualizar cache
    lastPromptText.value = promptText.value;
    cachedParsedColors.value = matches;

    return matches;
  });

  const finalPrompt = computed(() => {
    let result = promptText.value;
    parsedColors.value.forEach(({ placeholder, key }) => {
      result = result.replace(placeholder, colorSelections[key]);
    });
    return result;
  });

  const loadTasks = async () => {
    try {
      const allTasks = await db.tasks.orderBy("updatedAt").reverse().toArray();

      tasks.value = allTasks;

      if (tasks.value.length > 0) {
        await loadTask(tasks.value[0]);
      } else {
        await createNewTask();
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      await createNewTask();
    }
  };

  const createNewTask = async () => {
    try {
      const newTask = new Task({
        name: "Nueva Tarea",
        prompt:
          "Escribe tu prompt aquí. Usa {color} o {color:nombre} para colores dinámicos.",
      });

      await db.tasks.add(newTask);
      tasks.value.unshift(newTask);
      await loadTask(newTask);

      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const loadTask = async (task) => {
    currentTask.value = task;
    promptText.value = task.prompt;
    urlPost.value = task.url_post || "";
    urlVideo.value = task.url_video || "";

    Object.keys(colorSelections).forEach((key) => {
      delete colorSelections[key];
    });

    Object.assign(colorSelections, task.colors);
  };

  const saveCurrentTask = async () => {
    if (!currentTask.value) return;

    try {
      currentTask.value.prompt = promptText.value;
      currentTask.value.url_post = urlPost.value;
      currentTask.value.url_video = urlVideo.value;

      const validColors = {};
      parsedColors.value.forEach(({ key }) => {
        if (colorSelections[key]) {
          validColors[key] = colorSelections[key];
        }
      });

      currentTask.value.colors = validColors;
      currentTask.value.updatedAt = new Date().toISOString();

      // Crear un objeto plano sin reactividad de Vue
      const taskToSave = {
        id: currentTask.value.id,
        name: currentTask.value.name,
        prompt: currentTask.value.prompt,
        colors: { ...currentTask.value.colors },
        url_post: currentTask.value.url_post,
        url_video: currentTask.value.url_video,
        createdAt: currentTask.value.createdAt,
        updatedAt: currentTask.value.updatedAt,
      };

      await db.tasks.put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }
    } catch (error) {
      console.error("Error saving task:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Task data:", currentTask.value);
    }
  };

  const updateTaskName = async (name) => {
    if (!currentTask.value) return;

    try {
      currentTask.value.name = name;
      currentTask.value.updatedAt = new Date().toISOString();

      const taskToSave = {
        id: currentTask.value.id,
        name: currentTask.value.name,
        prompt: currentTask.value.prompt,
        colors: { ...currentTask.value.colors },
        url_post: currentTask.value.url_post || "",
        url_video: currentTask.value.url_video || "",
        createdAt: currentTask.value.createdAt,
        updatedAt: currentTask.value.updatedAt,
      };

      await db.tasks.put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }
    } catch (error) {
      console.error("Error updating task name:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await db.tasks.delete(taskId);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        tasks.value.splice(index, 1);
      }

      if (currentTask.value?.id === taskId) {
        if (tasks.value.length > 0) {
          await loadTask(tasks.value[0]);
        } else {
          await createNewTask();
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const duplicateTask = async (task) => {
    try {
      const duplicate = new Task({
        name: `${task.name} (copia)`,
        prompt: task.prompt,
        colors: { ...task.colors },
        url_post: task.url_post || "",
        url_video: task.url_video || "",
      });

      await db.tasks.add(duplicate);
      tasks.value.unshift(duplicate);

      return duplicate;
    } catch (error) {
      console.error("Error duplicating task:", error);
      throw error;
    }
  };

  const exportTasks = async () => {
    try {
      const allTasks = await db.tasks.toArray();

      const data = {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        tasks: allTasks,
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
      console.error("Error exporting tasks:", error);
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

          // Generar IDs únicos secuencialmente
          const baseId = Date.now();
          const newTasks = data.tasks.map((task, index) => {
            return {
              id: baseId + index, // IDs secuenciales garantizados únicos
              name: task.name || "Tarea importada",
              prompt: task.prompt || "",
              colors: task.colors || {},
              url_post: task.url_post || "", // Retrocompatibilidad
              url_video: task.url_video || "", // Retrocompatibilidad
              createdAt: task.createdAt || new Date().toISOString(),
              updatedAt: task.updatedAt || new Date().toISOString(),
            };
          });

          // Usar bulkAdd con nuevos IDs
          await db.tasks.bulkAdd(newTasks);

          // Agregar a lista local
          tasks.value.push(...newTasks);

          console.log(`✅ ${newTasks.length} tareas importadas`);
          resolve(newTasks.length);
        } catch (error) {
          console.error("Error importing tasks:", error);
          reject(new Error(`Error al importar: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });
  };

  const updateColor = (key, color) => {
    colorSelections[key] = color;
  };

  const updateVideoUrls = ({ url_post, url_video }) => {
    urlPost.value = url_post;
    urlVideo.value = url_video;
  };

  return {
    tasks,
    currentTask,
    promptText,
    colorSelections,
    urlPost,
    urlVideo,
    parsedColors,
    finalPrompt,
    createNewTask,
    loadTask,
    saveCurrentTask,
    updateTaskName,
    deleteTask,
    duplicateTask,
    exportTasks,
    importTasks,
    updateColor,
    updateVideoUrls,
  };
}
