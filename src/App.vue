<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
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

// Detectar mobile
const checkMobile = () => {
    isMobile.value = window.innerWidth <= 1024;
};

onMounted(() => {
    checkMobile();
    window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
    window.removeEventListener("resize", checkMobile);
});

const showConfig = computed(
    () => !isMobile.value || activeView.value === "config",
);
const showPreview = computed(
    () => !isMobile.value || activeView.value === "preview",
);
</script>

<template>
    <div class="app-wrapper">
        <ThemeToggle :is-dark="isDark" @toggle="toggleTheme" />

        <ConfigPanel
            v-show="showConfig"
            :parsed-colors="promptManager.parsedColors.value"
            :color-selections="promptManager.colorSelections"
            :active-slot="activeSlot"
            :current-task="promptManager.currentTask.value"
            :is-mobile="isMobile"
            @set-active="activeSlot = $event"
            @update-color="promptManager.updateColor"
            @update-task-name="promptManager.updateTaskName"
            @show-tasks="showTasks = true"
            @export-tasks="promptManager.exportTasks"
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
</template>

<style scoped>
.app-wrapper {
    display: flex;
    height: 100vh;
    width: 100vw;
    position: relative;
}
</style>
