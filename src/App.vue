<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import Header from "./components/Header.vue";
import TasksPanel from "./components/TasksPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import { usePromptManager } from "./composables/usePromptManager";
import { useTheme } from "./composables/useTheme";

const { isDark, toggleTheme } = useTheme();
const promptManager = usePromptManager();

const activeSlot = ref(null);
const showTasks = ref(false);
const isMobile = ref(false);
const activeView = ref("config");

// ✅ OPTIMIZACIÓN: Debounce en resize listener
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

// Función para manejar el click en tabs con toggle
const handleTabClick = (key) => {
    if (activeSlot.value === key) {
        // Si haces click en el tab activo, cierra la paleta
        activeSlot.value = null;
    } else {
        // Si haces click en otro tab, ábrelo
        activeSlot.value = key;
    }
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
                @export-tasks="promptManager.exportTasks"
                @update-video-urls="promptManager.updateVideoUrls"
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
                @duplicate-task="promptManager.duplicateTask"
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
}

.app-wrapper {
    display: flex;
    flex: 1;
    margin-top: 60px; /* Altura del header */
    height: calc(100vh - 60px);
    width: 100vw;
    position: relative;
    overflow: hidden;
}
</style>
