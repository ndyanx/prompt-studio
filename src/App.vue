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
const { restoreFromSupabase, manualSync } = useSyncManager();
const {
    promptText,
    currentTask,
    tasks,
    urlPost,
    urlVideo,
    loadTask,
    loadTasks,
    createNewTask,
    updateTaskName,
    deleteTask,
    deleteAllTasks,
    duplicateTask,
    exportTasks,
    updateVideoUrls,
} = usePromptManager();

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

onMounted(async () => {
    checkMobile();
    window.addEventListener("resize", debouncedCheckMobile);

    if (isAuthenticated.value) {
        const result = await restoreFromSupabase();
        if (result.success) {
            await loadTasks();
        }
    }
});

onUnmounted(() => {
    window.removeEventListener("resize", debouncedCheckMobile);
    clearTimeout(resizeTimeout);
});

watch(isAuthenticated, (newVal) => {
    if (newVal) {
        showAuthModal.value = false;
    }
});

const handleAuthSuccess = async (user) => {
    const result = await restoreFromSupabase();
    if (result.success) {
        await loadTasks();
    }
};

const handleOpenAuth = (mode = "login") => {
    authModalMode.value = mode;
    showAuthModal.value = true;
};

const handleSignOut = async () => {
    await signOut();
};

const handleSyncNow = async () => {
    await manualSync();
};

const handleSelectTask = (task) => {
    loadTask(task);
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
            @sync-now="handleSyncNow"
        />

        <div class="app-wrapper">
            <ConfigPanel
                v-show="showConfig"
                :current-task="currentTask"
                :all-tasks="tasks"
                :is-mobile="isMobile"
                :url-post="urlPost"
                :url-video="urlVideo"
                :show-album="showAlbum"
                @update-task-name="updateTaskName"
                @show-tasks="showTasks = true"
                @show-album="showAlbum = true"
                @export-tasks="exportTasks"
                @update-video-urls="updateVideoUrls"
                :is-authenticated="isAuthenticated"
            />

            <PreviewPanel
                v-show="showPreview"
                :prompt-text="promptText"
                :is-mobile="isMobile"
                @update-prompt="promptText = $event"
            />

            <MobileTabBar
                v-if="isMobile"
                :active-view="activeView"
                @change-view="activeView = $event"
            />

            <TasksPanel
                v-if="showTasks"
                :tasks="tasks"
                :current-task="currentTask"
                @close="showTasks = false"
                @load-task="loadTask"
                @create-task="createNewTask"
                @delete-task="deleteTask"
                @delete-all-tasks="deleteAllTasks"
                @duplicate-task="duplicateTask"
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
                :tasks="tasks"
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
    }
}
</style>
