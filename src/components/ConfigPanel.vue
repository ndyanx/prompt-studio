<script setup>
import { computed } from "vue";
import VideoPreview from "./VideoPreview.vue";
import { usePromptManager } from "../composables/usePromptManager";

const props = defineProps({
    currentTask: Object,
    isMobile: Boolean,
    allTasks: Array,
    urlPost: String,
    urlVideo: String,
    showAlbum: Boolean,
});

const emit = defineEmits([
    "update-task-name",
    "show-tasks",
    "export-tasks",
    "update-video-urls",
    "show-album",
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

// Map precalculado en O(n) — mismo patrón que TasksPanel para evitar
// recorrer el array completo cada vez que cambia currentTask.
const duplicateMap = computed(() => {
    if (!props.allTasks) return new Map();
    const map = new Map();
    for (const t of props.allTasks) {
        const name = t.name.trim();
        map.set(name, (map.get(name) || 0) + 1);
    }
    return map;
});

const duplicateCount = computed(() => {
    if (!props.currentTask) return 0;
    return duplicateMap.value.get(props.currentTask.name.trim()) || 0;
});

const hasDuplicates = computed(() => duplicateCount.value > 1);
</script>

<template>
    <main class="config-side" :class="{ mobile: isMobile }">
        <header class="main-header">
            <div class="header-content">
                <div class="title-section">
                    <span class="badge">Dynamic Prompt Editor</span>
                    <div class="task-name-wrapper">
                        <input
                            v-if="currentTask"
                            :value="currentTask.name"
                            @input="
                                emit('update-task-name', $event.target.value)
                            "
                            class="task-name-input"
                            placeholder="Nombre de la tarea"
                        />
                        <span
                            v-if="hasDuplicates"
                            class="duplicate-warning"
                            :title="`Existen ${duplicateCount} tareas con este nombre`"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                                />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            ×{{ duplicateCount }}
                        </span>
                    </div>
                    <p v-if="hasDuplicates" class="duplicate-message">
                        Ya existen {{ duplicateCount }} tareas con este nombre
                    </p>
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

                    <button
                        class="action-btn album-btn"
                        @click="emit('show-album')"
                        title="Ver álbum de videos"
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
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect
                                x="1"
                                y="5"
                                width="15"
                                height="14"
                                rx="2"
                                ry="2"
                            />
                        </svg>
                        <span v-if="!isMobile">Álbum</span>
                    </button>
                </div>
            </div>
        </header>

        <VideoPreview
            v-if="!showAlbum"
            :url-post="urlPost"
            :url-video="urlVideo"
            :is-visible="true"
            @update-urls="emit('update-video-urls', $event)"
        />

        <div class="mobile-spacer"></div>
    </main>
</template>

<style scoped>
.config-side {
    flex: 0 0 60%;
    display: flex;
    flex-direction: column;
    padding: 30px;
    border-right: 1px solid var(--border-color);
    background: var(--bg-primary);
    /*overflow-y: auto;*/
}

.config-side.mobile {
    height: 100vh;
    padding: 20px;
}

.main-header {
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

.task-name-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
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
    flex: 1;
    min-width: 0;
}

.task-name-input:focus {
    border-bottom-color: var(--accent);
}

.duplicate-warning {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(255, 149, 0, 0.15);
    color: #ff9500;
    font-size: 12px;
    font-weight: 700;
    border-radius: 6px;
    border: 1px solid rgba(255, 149, 0, 0.3);
    flex-shrink: 0;
    cursor: help;
    transition: all 0.2s;
}

.duplicate-warning:hover {
    background: rgba(255, 149, 0, 0.25);
}

.dark-theme .duplicate-warning {
    background: rgba(255, 159, 10, 0.2);
    color: #ff9f0a;
    border-color: rgba(255, 159, 10, 0.4);
}

.duplicate-message {
    font-size: 12px;
    color: #ff9500;
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: slideDown 0.3s ease;
}

.dark-theme .duplicate-message {
    color: #ff9f0a;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
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

@media (max-width: 768px) {
    .task-name-input {
        font-size: 22px;
    }

    .duplicate-warning {
        font-size: 11px;
        padding: 3px 6px;
    }

    .duplicate-message {
        font-size: 11px;
    }
}

/* Spacer para mobile - crea espacio extra al final */
.mobile-spacer {
    height: 0;
    min-height: 0;
}

@media (max-width: 1024px) {
    .mobile-spacer {
        height: 100px;
        min-height: 100px;
    }
}
</style>
