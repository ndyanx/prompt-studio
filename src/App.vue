<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import GalleryPanel from "./components/GalleryPanel.vue";
import Header from "./components/Header.vue";
import TasksPanel from "./components/TasksPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import AuthModal from "./components/AuthModal.vue";
import RandomVideoModal from "./components/RandomVideoModal.vue";

import { useThemeStore } from "./stores/useThemeStore";
import { useAuthStore } from "./stores/useAuthStore";
import { useSyncStore } from "./stores/useSyncStore";
import { usePromptStore } from "./stores/usePromptStore";

const themeStore = useThemeStore();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const promptStore = usePromptStore();

// ─── Estado local de UI ───────────────────────────────────────────────────
const showTasks = ref(false);
const showRandomVideo = ref(false);
// Inicializar síncronamente antes del primer render para evitar CLS.
// Si empieza en `false` y onMounted lo cambia a `true`, los
// <span v-if="!isMobile"> en header-actions desaparecen post-paint.
const isMobile = ref(window.innerWidth <= 1024);
const activeView = ref("config"); // "config" | "preview" (mobile)
const activeMainView = ref("studio"); // "studio" | "gallery"
const showAuthModal = ref(false);
const authModalMode = ref("login");

let resizeTimeout = null;

const checkMobile = () => {
    isMobile.value = window.innerWidth <= 1024;
};

const debouncedCheckMobile = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkMobile, 150);
};

onMounted(() => {
    checkMobile();
    window.addEventListener("resize", debouncedCheckMobile);
});

onUnmounted(() => {
    window.removeEventListener("resize", debouncedCheckMobile);
    clearTimeout(resizeTimeout);
});

watch(
    () => authStore.isAuthenticated,
    (newVal) => {
        if (newVal) showAuthModal.value = false;
    },
);

// ─── Handlers de UI ──────────────────────────────────────────────────────
const handleOpenAuth = (mode = "login") => {
    authModalMode.value = mode;
    showAuthModal.value = true;
};

const handleSignOut = async () => {
    await authStore.signOut();
};

const handleSyncNow = async () => {
    await syncStore.flushPendingQueue();
};

const handleSelectTask = (task) => {
    promptStore.loadTask(task);
};

const toggleMainView = () => {
    activeMainView.value =
        activeMainView.value === "studio" ? "gallery" : "studio";
};

/**
 * Llamado desde GalleryPanel cuando el usuario quiere ir a una tarea.
 * Carga la tarea, cambia a studio y en mobile va a config.
 */
const handleGoToTask = (taskId) => {
    const task = promptStore.tasks.find((t) => t.id === taskId);
    if (task) promptStore.loadTask(task);
    activeMainView.value = "studio";
    activeView.value = "config";
};

// ─── Layout computed ──────────────────────────────────────────────────────
const isStudio = computed(() => activeMainView.value === "studio");
const isGallery = computed(() => activeMainView.value === "gallery");

const showConfig = computed(
    () => isStudio.value && (!isMobile.value || activeView.value === "config"),
);
const showPreview = computed(
    () => isStudio.value && (!isMobile.value || activeView.value === "preview"),
);
</script>

<template>
    <div class="app-container">
        <Header
            :is-dark="themeStore.isDark"
            :is-mobile="isMobile"
            :active-main-view="activeMainView"
            @toggle-theme="themeStore.toggleTheme"
            @toggle-gallery="toggleMainView"
            :user="authStore.user"
            @open-auth="handleOpenAuth"
            @sign-out="handleSignOut"
            @show-tasks="showTasks = true"
            @sync-now="handleSyncNow"
        />

        <div class="app-wrapper">
            <!-- Vista Studio -->
            <ConfigPanel
                v-show="showConfig"
                :current-task="promptStore.currentTask"
                :all-tasks="promptStore.tasks"
                :is-mobile="isMobile"
                :media-list="promptStore.mediaList"
                :show-random-video="showRandomVideo"
                @update-task-name="promptStore.updateTaskName"
                @show-tasks="showTasks = true"
                @show-random-video="showRandomVideo = true"
                @export-tasks="promptStore.exportTasks"
            />

            <PreviewPanel
                v-show="showPreview"
                :prompt-text="promptStore.promptText"
                :is-mobile="isMobile"
                @update-prompt="promptStore.promptText = $event"
            />

            <!-- Vista Gallery -->
            <GalleryPanel
                v-if="isGallery"
                :tasks="promptStore.tasks"
                @go-to-task="handleGoToTask"
            />

            <!-- Tab bar mobile: solo en studio -->
            <MobileTabBar
                v-if="isMobile && isStudio"
                :active-view="activeView"
                @change-view="activeView = $event"
            />

            <TasksPanel
                v-if="showTasks"
                :tasks="promptStore.tasks"
                :current-task="promptStore.currentTask"
                @close="showTasks = false"
                @load-task="promptStore.loadTask"
                @create-task="promptStore.createNewTask"
                @delete-task="promptStore.deleteTask"
                @delete-all-tasks="promptStore.deleteAllTasks"
                @duplicate-task="promptStore.duplicateTask"
            />

            <AuthModal
                v-if="showAuthModal"
                :is-open="showAuthModal"
                :mode="authModalMode"
                @close="showAuthModal = false"
            />

            <RandomVideoModal
                v-if="showRandomVideo"
                :is-open="showRandomVideo"
                :tasks="promptStore.tasks"
                @close="showRandomVideo = false"
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

@media (max-width: 1024px) {
    .app-wrapper {
        flex-direction: column;
    }
}
</style>
