<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import Header from "./components/Header.vue";
import TasksPanel from "./components/TasksPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import AuthModal from "./components/AuthModal.vue";
import AlbumModal from "./components/AlbumModal.vue";
import SyncStatus from "./components/SyncStatus.vue";
import { usePromptManager } from "./composables/usePromptManager";
import { useTheme } from "./composables/useTheme";
import { useAuth } from "./composables/useAuth";
import { useSyncManager } from "./composables/useSyncManager";

const { isDark, toggleTheme } = useTheme();
const { user, isAuthenticated, signOut } = useAuth();
const { restoreFromSupabase } = useSyncManager();
const promptManager = usePromptManager();

const activeSlot = ref(null);
const showTasks = ref(false);
const showAlbum = ref(false);
const isMobile = ref(false);
const activeView = ref("config");
const showAuthModal = ref(false);
const authModalMode = ref("login");

// ✅ OPTIMIZACIÓN: Debounce en resize listener
let resizeTimeout = null;

const checkMobile = () => {
    isMobile.value = window.innerWidth <= 1024;
};

const debouncedCheckMobile = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkMobile, 150);
};

onMounted(async () => {
    checkMobile();
    window.addEventListener("resize", debouncedCheckMobile);

    // Restaurar desde Supabase si está autenticado
    if (isAuthenticated.value) {
        const result = await restoreFromSupabase();
        if (result.success) {
            console.log(`🔄 ${result.tasks} tareas restauradas`);
            await promptManager.loadTasks();
        }
    }
});

onUnmounted(() => {
    window.removeEventListener("resize", debouncedCheckMobile);
    clearTimeout(resizeTimeout);
});

// Vigilar cambios en parsedColors para cerrar la paleta si el color activo ya no existe
watch(
    () => promptManager.parsedColors.value,
    (newColors) => {
        if (activeSlot.value) {
            const stillExists = newColors.some(
                (color) => color.key === activeSlot.value,
            );
            if (!stillExists) {
                activeSlot.value = null;
            }
        }
    },
    { deep: true },
);

// Watcher para autenticación
watch(isAuthenticated, (newVal) => {
    if (newVal) {
        console.log("✅ Usuario autenticado, sync activado");
        showAuthModal.value = false;
    }
});

// Función para manejar el click en tabs con toggle
const handleTabClick = (key) => {
    if (activeSlot.value === key) {
        activeSlot.value = null;
    } else {
        activeSlot.value = key;
    }
};

// Manejo de auth
const handleAuthSuccess = async (user) => {
    console.log("✅ Auth exitosa:", user.email);
    const result = await restoreFromSupabase();
    if (result.success) {
        console.log(`🔄 ${result.tasks} tareas restauradas`);
        await promptManager.loadTasks();
    }
};

const handleOpenAuth = (mode = "login") => {
    authModalMode.value = mode;
    showAuthModal.value = true;
};

const handleSignOut = async () => {
    await signOut();
    console.log("👋 Usuario desconectado");
};

const handleSelectTask = (task) => {
    promptManager.loadTask(task);
    console.log("✅ Tarea seleccionada desde álbum:", task.name);
};

const showConfig = computed(
    () => !isMobile.value || activeView.value === "config",
);
const showPreview = computed(
    () => !isMobile.value || activeView.value === "preview",
);
</script>

<template>
    <div class="app-container">
        <Header
            :is-dark="isDark"
            :is-mobile="isMobile"
            @toggle-theme="toggleTheme"
            :user="user"
            @open-auth="handleOpenAuth"
            @sign-out="handleSignOut"
            @show-tasks="showTasks = true"
        />

        <div class="app-wrapper">
            <ConfigPanel
                v-show="showConfig"
                :parsed-colors="promptManager.parsedColors.value"
                :color-selections="promptManager.colorSelections"
                :active-slot="activeSlot"
                :current-task="promptManager.currentTask.value"
                :all-tasks="promptManager.tasks.value"
                :is-mobile="isMobile"
                :url-post="promptManager.urlPost.value"
                :url-video="promptManager.urlVideo.value"
                @set-active="handleTabClick"
                @update-color="promptManager.updateColor"
                @update-task-name="promptManager.updateTaskName"
                @show-tasks="showTasks = true"
                @show-album="showAlbum = true"
                @export-tasks="promptManager.exportTasks"
                @update-video-urls="promptManager.updateVideoUrls"
                :is-authenticated="isAuthenticated"
            />

            <PreviewPanel
                v-show="showPreview"
                :prompt-text="promptManager.promptText.value"
                :final-prompt="promptManager.finalPrompt.value"
                :parsed-colors="promptManager.parsedColors.value"
                :color-selections="promptManager.colorSelections"
                :is-mobile="isMobile"
                @update-prompt="promptManager.promptText.value = $event"
            />

            <MobileTabBar
                v-if="isMobile"
                :active-view="activeView"
                @change-view="activeView = $event"
            />

            <TasksPanel
                v-if="showTasks"
                :tasks="promptManager.tasks.value"
                :current-task="promptManager.currentTask.value"
                @close="showTasks = false"
                @load-task="promptManager.loadTask"
                @create-task="promptManager.createNewTask"
                @delete-task="promptManager.deleteTask"
                @delete-all-tasks="promptManager.deleteAllTasks"
                @duplicate-task="promptManager.duplicateTask"
            />

            <!-- Auth Modal -->
            <AuthModal
                v-if="showAuthModal"
                :is-open="showAuthModal"
                :mode="authModalMode"
                @close="showAuthModal = false"
                @success="handleAuthSuccess"
            />

            <!-- Album Modal -->
            <AlbumModal
                v-if="showAlbum"
                :is-open="showAlbum"
                :tasks="promptManager.tasks.value"
                @close="showAlbum = false"
                @select-task="handleSelectTask"
            />
        </div>
    </div>
</template>

<style scoped>
.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-primary);
}

.app-wrapper {
    display: flex;
    flex: 1;
    margin-top: 60px;
    height: calc(100vh - 60px);
    width: 100vw;
    position: relative;
    overflow: hidden;
}

/* Mobile adjustments */
@media (max-width: 1024px) {
    .app-wrapper {
        flex-direction: column;
        padding-bottom: 60px; /* Espacio para tab bar */
    }
}
</style>
