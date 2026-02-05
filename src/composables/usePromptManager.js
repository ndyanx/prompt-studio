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
let supabase = null;
let currentUserId = null;

// Tracking de operaciones pendientes de Supabase
const pendingSupabaseOps = ref(0);

export function usePromptManager() {
  onMounted(async () => {
    if (!initialized) {
      initialized = true;
      await initDB();
      await loadTasks();

      // Watches para auto-guardar
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

  // ========================================
  // CONFIGURAR SUPABASE
  // ========================================
  const setSupabaseClient = (client, userId) => {
    supabase = client;
    currentUserId = userId;
  };

  // ========================================
  // TRACKING DE OPERACIONES PENDIENTES
  // ========================================
  const waitForPendingOperations = async (maxWaitMs = 10000) => {
    if (pendingSupabaseOps.value === 0) {
      return true;
    }

    console.log(
      `⏳ Esperando ${pendingSupabaseOps.value} operaciones pendientes...`,
    );

    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (pendingSupabaseOps.value === 0) {
          clearInterval(checkInterval);
          console.log("✅ Todas las operaciones completadas");
          resolve(true);
        } else if (elapsed >= maxWaitMs) {
          clearInterval(checkInterval);
          console.warn(
            `⚠️ Timeout: ${pendingSupabaseOps.value} operaciones aún pendientes`,
          );
          resolve(false);
        }
      }, 100);
    });
  };

  // ========================================
  // SINCRONIZACIÓN CON SUPABASE
  // ========================================

  // Sincronizar tareas locales con Supabase (al hacer login/signup)
  const syncLocalTasksToSupabase = async () => {
    if (!supabase || !currentUserId) {
      console.log("⚠️ No hay conexión a Supabase");
      return;
    }

    try {
      pendingSupabaseOps.value++;

      // 1. Obtener todas las tareas locales
      const localTasks = await db.tasks.toArray();

      if (localTasks.length === 0) {
        console.log("ℹ️ No hay tareas locales para sincronizar");
        return;
      }

      // 2. Preparar tareas para Supabase
      const tasksToUpload = localTasks.map((task) => ({
        id: task.id,
        user_id: currentUserId,
        name: task.name,
        prompt: task.prompt,
        colors: task.colors || {},
        url_post: task.url_post || "",
        url_video: task.url_video || "",
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      }));

      // 3. Subir a Supabase (upsert para evitar duplicados)
      const { error } = await supabase.from("tasks").upsert(tasksToUpload, {
        onConflict: "id",
      });

      if (error) {
        console.error("❌ Error al sincronizar tareas:", error);
        throw error;
      }

      console.log(`✅ ${localTasks.length} tareas sincronizadas con Supabase`);
    } catch (error) {
      console.error("❌ Error en sincronización:", error);
      throw error;
    } finally {
      pendingSupabaseOps.value--;
    }
  };

  // Cargar tareas desde Supabase (al hacer login)
  const loadTasksFromSupabase = async () => {
    if (!supabase || !currentUserId) {
      console.log("⚠️ No hay conexión a Supabase");
      return;
    }

    try {
      pendingSupabaseOps.value++;

      // 1. Obtener tareas del usuario desde Supabase
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", currentUserId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log("ℹ️ No hay tareas en Supabase para este usuario");
        return;
      }

      // 2. Limpiar IndexedDB
      await db.tasks.clear();

      // 3. Convertir formato Supabase a formato local
      const localTasks = data.map((task) => ({
        id: task.id,
        name: task.name,
        prompt: task.prompt,
        colors: task.colors || {},
        url_post: task.url_post || "",
        url_video: task.url_video || "",
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      }));

      // 4. Guardar en IndexedDB
      await db.tasks.bulkAdd(localTasks);

      // 5. Actualizar estado local
      tasks.value = localTasks;

      if (tasks.value.length > 0) {
        await loadTask(tasks.value[0]);
      }

      console.log(`✅ ${localTasks.length} tareas cargadas desde Supabase`);
    } catch (error) {
      console.error("❌ Error al cargar tareas desde Supabase:", error);
      throw error;
    } finally {
      pendingSupabaseOps.value--;
    }
  };

  // Guardar tarea en Supabase
  const saveTaskToSupabase = async (task) => {
    if (!supabase || !currentUserId) {
      return; // Solo guardar localmente si no hay conexión
    }

    try {
      pendingSupabaseOps.value++;

      const taskData = {
        id: task.id,
        user_id: currentUserId,
        name: task.name,
        prompt: task.prompt,
        colors: task.colors || {},
        url_post: task.url_post || "",
        url_video: task.url_video || "",
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      };

      const { error } = await supabase.from("tasks").upsert(taskData, {
        onConflict: "id",
      });

      if (error) throw error;

      console.log(`✅ Tarea "${task.name}" guardada en Supabase`);
    } catch (error) {
      console.error("❌ Error al guardar en Supabase:", error);
      throw error;
    } finally {
      pendingSupabaseOps.value--;
    }
  };

  // Eliminar tarea de Supabase
  const deleteTaskFromSupabase = async (taskId) => {
    if (!supabase || !currentUserId) {
      return;
    }

    try {
      pendingSupabaseOps.value++;

      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      console.log(`✅ Tarea eliminada de Supabase`);
    } catch (error) {
      console.error("❌ Error al eliminar de Supabase:", error);
      throw error;
    } finally {
      pendingSupabaseOps.value--;
    }
  };

  // ========================================
  // MANEJO DE AUTENTICACIÓN
  // ========================================

  // Llamar cuando el usuario hace SIGNUP (registrar tareas locales)
  const handleUserSignup = async (userId, client) => {
    setSupabaseClient(client, userId);
    await syncLocalTasksToSupabase();
    await loadTasksFromSupabase(); // Recargar desde Supabase
  };

  // Llamar cuando el usuario hace LOGIN (reemplazar tareas locales)
  const handleUserLogin = async (userId, client) => {
    setSupabaseClient(client, userId);
    await loadTasksFromSupabase(); // Elimina locales y carga remotas
  };

  // Llamar cuando el usuario hace LOGOUT (limpiar y crear tarea por defecto)
  const handleUserLogout = async () => {
    console.log("🔄 Limpiando tareas al hacer logout...");

    // 1. Esperar operaciones pendientes (máximo 10 segundos)
    const completed = await waitForPendingOperations(10000);

    if (!completed) {
      console.warn("⚠️ Algunas operaciones no terminaron a tiempo");
    }

    // 2. Limpiar conexión de Supabase (ya no podemos usarlo)
    supabase = null;
    currentUserId = null;
    // NO resetear el contador aquí - ya está en 0 por waitForPendingOperations

    // 3. Limpiar IndexedDB
    await db.tasks.clear();
    console.log("✅ IndexedDB limpiado");

    // 4. Limpiar estado local
    tasks.value = [];

    // 5. Crear tarea por defecto
    const defaultTask = new Task({
      name: "Nueva Tarea",
      prompt:
        "Escribe tu prompt aquí. Usa {color} o {color:nombre} para colores dinámicos.",
    });

    // 6. Guardar tarea por defecto localmente (NO en Supabase)
    await db.tasks.add(defaultTask);
    tasks.value = [defaultTask];
    await loadTask(defaultTask);

    console.log("✅ Tarea por defecto creada después del logout");
  };

  // ========================================
  // FUNCIONES ORIGINALES (con sincronización)
  // ========================================

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

      // Guardar localmente
      await db.tasks.add(newTask);
      tasks.value.unshift(newTask);
      await loadTask(newTask);

      // Guardar en Supabase si está autenticado
      await saveTaskToSupabase(newTask);

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

      // Guardar localmente
      await db.tasks.put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }

      // Guardar en Supabase si está autenticado
      await saveTaskToSupabase(taskToSave);
    } catch (error) {
      console.error("Error saving task:", error);
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

      // Guardar localmente
      await db.tasks.put(taskToSave);

      const index = tasks.value.findIndex((t) => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks.value[index] = { ...currentTask.value };
      }

      // Guardar en Supabase si está autenticado
      await saveTaskToSupabase(taskToSave);
    } catch (error) {
      console.error("Error updating task name:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      // Eliminar localmente
      await db.tasks.delete(taskId);

      const index = tasks.value.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        tasks.value.splice(index, 1);
      }

      // Eliminar de Supabase si está autenticado
      await deleteTaskFromSupabase(taskId);

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

      // Guardar localmente
      await db.tasks.add(duplicate);
      tasks.value.unshift(duplicate);

      // Guardar en Supabase si está autenticado
      await saveTaskToSupabase(duplicate);

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

          const baseId = Date.now();
          const newTasks = data.tasks.map((task, index) => {
            return {
              id: baseId + index,
              name: task.name || "Tarea importada",
              prompt: task.prompt || "",
              colors: task.colors || {},
              url_post: task.url_post || "",
              url_video: task.url_video || "",
              createdAt: task.createdAt || new Date().toISOString(),
              updatedAt: task.updatedAt || new Date().toISOString(),
            };
          });

          // Guardar localmente
          await db.tasks.bulkAdd(newTasks);
          tasks.value.push(...newTasks);

          // Guardar en Supabase si está autenticado
          if (supabase && currentUserId) {
            for (const task of newTasks) {
              await saveTaskToSupabase(task);
            }
          }

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
    // Estado
    tasks,
    currentTask,
    promptText,
    colorSelections,
    urlPost,
    urlVideo,
    parsedColors,
    finalPrompt,
    pendingSupabaseOps, // Exportar para mostrar en UI

    // Funciones originales
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

    // Funciones de sincronización
    handleUserSignup,
    handleUserLogin,
    handleUserLogout,
  };
}
