<script setup>
import { computed } from "vue";
import ColorTabs from "./ColorTabs.vue";
import ColorPalette from "./ColorPalette.vue";
import { usePromptManager } from "../composables/usePromptManager";

const props = defineProps({
    parsedColors: Array,
    colorSelections: Object,
    activeSlot: String,
    currentTask: Object,
    isMobile: Boolean,
});

const emit = defineEmits([
    "set-active",
    "update-color",
    "update-task-name",
    "show-tasks",
    "export-tasks",
]);

const { importTasks } = usePromptManager();

const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const count = await importTasks(file);
                alert(`${count} tareas importadas correctamente`);
            } catch (error) {
                alert(error.message);
            }
        }
    };
    input.click();
};
</script>

<template>
    <main class="config-side" :class="{ mobile: isMobile }">
        <header class="main-header">
            <div class="header-content">
                <div class="title-section">
                    <span class="badge">Dynamic Prompt Editor</span>
                    <input
                        v-if="currentTask"
                        :value="currentTask.name"
                        @input="emit('update-task-name', $event.target.value)"
                        class="task-name-input"
                        placeholder="Nombre de la tarea"
                    />
                </div>

                <div class="header-actions">
                    <button
                        class="action-btn"
                        @click="emit('show-tasks')"
                        title="Ver tareas"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"
                            />
                        </svg>
                        <span v-if="!isMobile">Tareas</span>
                    </button>

                    <button
                        class="action-btn"
                        @click="emit('export-tasks')"
                        title="Exportar tareas"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span v-if="!isMobile">Exportar</span>
                    </button>

                    <button
                        class="action-btn"
                        @click="handleImport"
                        title="Importar tareas"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span v-if="!isMobile">Importar</span>
                    </button>
                </div>
            </div>

            <div class="help-text" v-if="parsedColors.length === 0">
                💡 Usa <code>{color}</code> o <code>{color:nombre}</code> en tu
                prompt
            </div>
        </header>

        <div class="tabs-wrapper" v-if="parsedColors.length > 0">
            <ColorTabs
                :parsed-colors="parsedColors"
                :color-selections="colorSelections"
                :active-slot="activeSlot"
                @set-active="emit('set-active', $event)"
            />
        </div>

        <ColorPalette
            v-if="activeSlot"
            :active-slot="activeSlot"
            :color-selections="colorSelections"
            @update-color="emit('update-color', activeSlot, $event)"
        />

        <div v-else class="no-selection">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
            </svg>
            <p>Selecciona un color arriba</p>
        </div>
    </main>
</template>

<style scoped>
.config-side {
    flex: 0 0 60%;
    display: flex;
    flex-direction: column;
    padding: 40px;
    border-right: 1px solid var(--border-color);
    background: var(--bg-primary);
    overflow-y: auto;
}

.config-side.mobile {
    height: 100vh;
    padding: 20px;
}

.main-header {
    margin-bottom: 30px;
    flex-shrink: 0;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
}

.title-section {
    flex: 1;
    min-width: 0;
}

.badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 1px;
    display: block;
    margin-bottom: 8px;
}

.task-name-input {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    padding: 4px 0;
    border-bottom: 2px solid transparent;
    transition: border-color 0.2s;
}

.task-name-input:focus {
    border-bottom-color: var(--accent);
}

.header-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.action-btn {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
}

.action-btn:hover {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.help-text {
    margin-top: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.help-text code {
    background: var(--card-bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", monospace;
    color: var(--accent);
}

/* Wrapper para tabs con scroll si son muchos */
.tabs-wrapper {
    flex-shrink: 0;
    margin-bottom: 20px;
    max-height: 40vh;
    overflow-y: auto;
}

.no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 14px;
    padding: 40px;
    text-align: center;
}

.no-selection svg {
    opacity: 0.3;
}

.no-selection p {
    font-weight: 500;
}

@media (max-width: 768px) {
    .task-name-input {
        font-size: 22px;
    }
}
</style>
