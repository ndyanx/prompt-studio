<script setup>
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import TasksPanel from "./components/TasksPanel.vue";
import { usePromptManager } from "./composables/usePromptManager";
import { useTheme } from "./composables/useTheme";
import { ref } from "vue";

const { isDark, toggleTheme } = useTheme();
const promptManager = usePromptManager();

const activeSlot = ref(null);
const showTasks = ref(false);
</script>

<template>
    <div class="app-wrapper">
        <ThemeToggle :is-dark="isDark" @toggle="toggleTheme" />

        <ConfigPanel
            :parsed-colors="promptManager.parsedColors.value"
            :color-selections="promptManager.colorSelections"
            :active-slot="activeSlot"
            :current-task="promptManager.currentTask.value"
            @set-active="activeSlot = $event"
            @update-color="promptManager.updateColor"
            @update-task-name="promptManager.updateTaskName"
            @show-tasks="showTasks = true"
            @export-tasks="promptManager.exportTasks"
            @import-tasks="promptManager.importTasks"
        />

        <PreviewPanel
            :prompt-text="promptManager.promptText.value"
            :final-prompt="promptManager.finalPrompt.value"
            :parsed-colors="promptManager.parsedColors.value"
            :color-selections="promptManager.colorSelections"
            @update-prompt="promptManager.promptText.value = $event"
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
