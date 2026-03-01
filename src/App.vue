<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import Header from "./components/Header.vue";
import TasksPanel from "./components/TasksPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import AuthModal from "./components/AuthModal.vue";
import AlbumModal from "./components/AlbumModal.vue";

// ─── Stores (reemplazan los composables) ──────────────────────────────────────
import { useThemeStore } from "./stores/useThemeStore";
import { useAuthStore } from "./stores/useAuthStore";
import { useSyncStore } from "./stores/useSyncStore";
import { usePromptStore } from "./stores/usePromptStore";

const themeStore = useThemeStore();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const promptStore = usePromptStore();

// ─── Estado local de UI (solo vive en este componente) ────────────────────────
const showTasks = ref(false);
const showAlbum = ref(false);
const isMobile = ref(false);
const activeView = ref("config");
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

// Cerrar modal cuando el usuario se autentica correctamente
watch(
    () => authStore.isAuthenticated,
    (newVal) => {
        if (newVal) showAuthModal.value = false;
    },
);

// ─── Handlers de UI ───────────────────────────────────────────────────────────
const handleOpenAuth = (mode = "login") => {
    authModalMode.value = mode;
    showAuthModal.value = true;
};

const handleSignOut = async () => {
    await authStore.signOut();
};

const handleSyncNow = async () => {
    await syncStore.manualSync();
};

const handleSelectTask = (task) => {
    promptStore.loadTask(task);
};

// ─── Layout computed ──────────────────────────────────────────────────────────
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
            :is-dark="themeStore.isDark"
            :is-mobile="isMobile"
            @toggle-theme="themeStore.toggleTheme"
            :user="authStore.user"
            @open-auth="handleOpenAuth"
            @sign-out="handleSignOut"
            @show-tasks="showTasks = true"
            @sync-now="handleSyncNow"
        />

        <div class="app-wrapper">
            <ConfigPanel
                v-show="showConfig"
                :current-task="promptStore.currentTask"
                :all-tasks="promptStore.tasks"
                :is-mobile="isMobile"
                :media-list="promptStore.mediaList"
                :show-album="showAlbum"
                @update-task-name="promptStore.updateTaskName"
                @show-tasks="showTasks = true"
                @show-album="showAlbum = true"
                @export-tasks="promptStore.exportTasks"
            />

            <PreviewPanel
                v-show="showPreview"
                :prompt-text="promptStore.promptText"
                :is-mobile="isMobile"
                @update-prompt="promptStore.promptText = $event"
            />

            <MobileTabBar
                v-if="isMobile"
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

            <AlbumModal
                v-if="showAlbum"
                :is-open="showAlbum"
                :tasks="promptStore.tasks"
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

@media (max-width: 1024px) {
    .app-wrapper {
        flex-direction: column;
    }
}
</style>
