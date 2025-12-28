import { ref, reactive, computed, watch, onMounted } from "vue";

const STORAGE_KEY = "prompt-studio-tasks";

// Estado global
const tasks = ref([]);
const currentTask = ref(null);
const promptText = ref("");
const colorSelections = reactive({});

let initialized = false;

export function usePromptManager() {
  onMounted(() => {
    if (!initialized) {
      initialized = true;
      loadTasks();

      // Auto-guardar tarea actual
      watch(
        [promptText, colorSelections],
        () => {
          if (currentTask.value) {
            saveCurrentTask();
          }
        },
        { deep: true },
      );
    }
  });

  // Parsear el prompt para encontrar placeholders {color} o {color:nombre}
  const parsedColors = computed(() => {
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

      // Inicializar color si no existe
      if (!colorSelections[key]) {
        colorSelections[key] = "SlateGray";
      }

      index++;
    }

    return matches;
  });

  // Generar el prompt final con colores aplicados
  const finalPrompt = computed(() => {
    let result = promptText.value;
    parsedColors.value.forEach(({ placeholder, key }) => {
      result = result.replace(placeholder, colorSelections[key]);
    });
    return result;
  });

  // Cargar tareas desde localStorage
  const loadTasks = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        tasks.value = JSON.parse(stored);

        // Cargar última tarea o crear una nueva
        if (tasks.value.length > 0) {
          loadTask(tasks.value[0]);
        } else {
          createNewTask();
        }
      } else {
        createNewTask();
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      createNewTask();
    }
  };

  // Guardar tareas en localStorage
  const saveTasks = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value));
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  };

  // Crear nueva tarea
  const createNewTask = () => {
    const newTask = {
      id: Date.now(),
      name: "Nueva Tarea",
      prompt:
        "Escribe tu prompt aquí. Usa {color} o {color:nombre} para colores dinámicos.",
      colors: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.value.unshift(newTask);
    loadTask(newTask);
    saveTasks();

    return newTask;
  };

  // Cargar una tarea
  const loadTask = (task) => {
    currentTask.value = task;
    promptText.value = task.prompt;
    Object.assign(colorSelections, task.colors);
  };

  // Guardar tarea actual
  const saveCurrentTask = () => {
    if (!currentTask.value) return;

    currentTask.value.prompt = promptText.value;
    currentTask.value.colors = { ...colorSelections };
    currentTask.value.updatedAt = new Date().toISOString();

    saveTasks();
  };

  // Actualizar nombre de tarea
  const updateTaskName = (name) => {
    if (currentTask.value) {
      currentTask.value.name = name;
      saveTasks();
    }
  };

  // Eliminar tarea
  const deleteTask = (taskId) => {
    const index = tasks.value.findIndex((t) => t.id === taskId);
    if (index === -1) return;

    tasks.value.splice(index, 1);

    // Si eliminamos la tarea actual, cargar otra
    if (currentTask.value?.id === taskId) {
      if (tasks.value.length > 0) {
        loadTask(tasks.value[0]);
      } else {
        createNewTask();
      }
    }

    saveTasks();
  };

  // Duplicar tarea
  const duplicateTask = (task) => {
    const duplicate = {
      id: Date.now(),
      name: `${task.name} (copia)`,
      prompt: task.prompt,
      colors: { ...task.colors },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.value.unshift(duplicate);
    saveTasks();

    return duplicate;
  };

  // Exportar tareas a JSON
  const exportTasks = () => {
    const data = {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      tasks: tasks.value,
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
  };

  // Importar tareas desde JSON
  const importTasks = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.tasks || !Array.isArray(data.tasks)) {
            reject(new Error("Formato de archivo inválido"));
            return;
          }

          // Agregar tareas importadas
          data.tasks.forEach((task) => {
            // Asignar nuevo ID para evitar duplicados
            task.id = Date.now() + Math.random();
            tasks.value.push(task);
          });

          saveTasks();
          resolve(data.tasks.length);
        } catch (error) {
          reject(new Error("Error al leer el archivo JSON"));
        }
      };

      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });
  };

  // Actualizar color de un slot
  const updateColor = (key, color) => {
    colorSelections[key] = color;
  };

  return {
    // Estado
    tasks,
    currentTask,
    promptText,
    colorSelections,
    parsedColors,
    finalPrompt,

    // Métodos
    createNewTask,
    loadTask,
    saveCurrentTask,
    updateTaskName,
    deleteTask,
    duplicateTask,
    exportTasks,
    importTasks,
    updateColor,
  };
}
