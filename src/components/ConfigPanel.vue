<script setup>
import { computed, ref } from "vue";
import VideoPreview from "./VideoPreview.vue";
import { usePromptManager } from "../composables/usePromptManager";

const props = defineProps({
    currentTask: Object,
    isMobile: Boolean,
    allTasks: Array,
    mediaList: Array,
    showAlbum: Boolean,
});

const emit = defineEmits([
    "update-task-name",
    "show-tasks",
    "export-tasks",
    "show-album",
]);

const { importTasks, updateMediaSlot, addMediaSlot, removeMediaSlot } =
    usePromptManager();

const confirmDelete = ref(null); // index del slot a eliminar, null = cerrado
const confirmInput = ref("");

const requestRemoveSlot = (index) => {
    confirmDelete.value = index;
    confirmInput.value = "";
};

const confirmRemoveSlot = () => {
    if (
        confirmDelete.value !== null &&
        confirmInput.value.toLowerCase() === "eliminar"
    ) {
        removeMediaSlot(confirmDelete.value);
        confirmDelete.value = null;
        confirmInput.value = "";
    }
};

const cancelRemoveSlot = () => {
    confirmDelete.value = null;
    confirmInput.value = "";
};

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

        <!-- Lista de slots de media -->
        <div v-if="!showAlbum && confirmDelete === null" class="media-list">
            <div
                v-for="(slot, index) in mediaList"
                :key="index"
                class="media-slot"
            >
                <!-- Cabecera del slot: solo visible cuando hay más de uno -->
                <div v-if="mediaList.length > 1" class="slot-header">
                    <span class="slot-label">Post {{ index + 1 }}</span>
                    <button
                        class="remove-slot-btn"
                        @click="requestRemoveSlot(index)"
                        :disabled="mediaList.length <= 1"
                        title="Eliminar este post"
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
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <VideoPreview
                    :url-post="slot.url_post"
                    :url-video="slot.url_video"
                    :is-visible="true"
                    @update-urls="updateMediaSlot(index, $event)"
                />
            </div>

            <!-- Agregar nuevo slot -->
            <button class="add-slot-btn" @click="addMediaSlot">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar otro post
            </button>
        </div>

        <div class="mobile-spacer"></div>

        <!-- Modal confirmación eliminar slot -->
        <Teleport to="body">
            <div
                v-if="confirmDelete !== null"
                class="modal-overlay"
                @click.self="cancelRemoveSlot"
            >
                <div class="modal-box">
                    <p class="modal-text">
                        ¿Eliminar Post {{ confirmDelete + 1 }}?
                    </p>
                    <p class="modal-sub">
                        Se perderán la URL del post y el video asociado.
                    </p>
                    <input
                        v-model="confirmInput"
                        class="modal-input"
                        placeholder='Escribe "eliminar" para confirmar'
                        @keyup.enter="confirmRemoveSlot"
                        @keyup.esc="cancelRemoveSlot"
                        autofocus
                    />
                    <div class="modal-actions">
                        <button
                            class="modal-btn cancel"
                            @click="cancelRemoveSlot"
                        >
                            Cancelar
                        </button>
                        <button
                            class="modal-btn confirm"
                            @click="confirmRemoveSlot"
                            :disabled="
                                confirmInput.toLowerCase() !== 'eliminar'
                            "
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
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
    transition:
        background 0.2s,
        border-color 0.2s;
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
    transition:
        background 0.2s,
        color 0.2s,
        border-color 0.2s;
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

/* Media list */
.media-list {
    display: flex;
    flex-direction: column;
}

.media-slot {
    display: flex;
    flex-direction: column;
}

.slot-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0 4px;
    margin-top: 6px;
    border-top: 1px solid var(--border-color);
}

.slot-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.remove-slot-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: var(--text-secondary);
    transition:
        background 0.2s,
        color 0.2s,
        border-color 0.2s;
    padding: 0;
}

.remove-slot-btn:hover:not(:disabled) {
    background: rgba(255, 59, 48, 0.1);
    border-color: rgba(255, 59, 48, 0.3);
    color: #ff3b30;
}

.remove-slot-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.add-slot-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 16px;
    padding: 10px;
    background: transparent;
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    transition:
        background 0.2s,
        border-color 0.2s,
        color 0.2s;
}

.add-slot-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
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
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-box {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    width: 300px;
    box-shadow: var(--shadow-lg);
}

.modal-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
}

.modal-sub {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    gap: 8px;
}

.modal-btn {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.modal-btn.cancel {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.modal-btn.cancel:hover {
    background: var(--hover-bg);
}

.modal-input {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    margin-bottom: 16px;
    transition: border-color 0.2s;
}

.modal-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.modal-input::placeholder {
    color: var(--text-secondary);
}

.modal-btn.confirm {
    background: #ff3b30;
    color: white;
    border-color: #ff3b30;
    transition: all 0.2s;
}

.modal-btn.confirm:hover:not(:disabled) {
    background: #ff453a;
    border-color: #ff453a;
}

.modal-btn.confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
