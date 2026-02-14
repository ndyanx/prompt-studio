<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import VideoPreview from "./VideoPreview.vue";

const props = defineProps({
    tasks: Array,
    isOpen: Boolean,
});

const emit = defineEmits(["close", "select-task"]);

const currentTaskIndex = ref(0);
const previousIndex = ref(-1);
const preloadedNextIndex = ref(null);
const preloadElement = ref(null);

// Filtrar solo tareas que tienen video
const tasksWithVideo = computed(() => {
    return props.tasks.filter(
        (task) => task.url_video && task.url_video.trim() !== "",
    );
});

// Tarea actual mostrada
const currentTask = computed(() => {
    if (tasksWithVideo.value.length === 0) return null;
    return tasksWithVideo.value[currentTaskIndex.value];
});

// Calcular el siguiente índice aleatorio sin repetir el actual
const getRandomNextIndex = () => {
    if (tasksWithVideo.value.length <= 1) return null;

    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * tasksWithVideo.value.length);
    } while (newIndex === currentTaskIndex.value);

    return newIndex;
};

// Precargar metadata del siguiente video
const preloadNextVideo = async () => {
    if (tasksWithVideo.value.length <= 1) return;

    // Calcular siguiente índice
    const nextIndex = getRandomNextIndex();
    if (nextIndex === null) return;

    preloadedNextIndex.value = nextIndex;
    const nextTask = tasksWithVideo.value[nextIndex];

    // Crear elemento de precarga si no existe
    if (!preloadElement.value) {
        preloadElement.value = document.createElement("video");
        preloadElement.value.preload = "metadata";
        preloadElement.value.style.display = "none";
    }

    // Cargar metadata del siguiente video
    preloadElement.value.src = nextTask.url_video;

    console.log(
        `🎬 Precargando metadata del siguiente video: ${nextTask.name}`,
    );
};

// Seleccionar tarea aleatoria evitando repetir la anterior
const randomizeTask = () => {
    if (tasksWithVideo.value.length === 0) return;

    if (tasksWithVideo.value.length === 1) {
        currentTaskIndex.value = 0;
        return;
    }

    // Si hay un video precargado, usarlo
    if (preloadedNextIndex.value !== null) {
        previousIndex.value = currentTaskIndex.value;
        currentTaskIndex.value = preloadedNextIndex.value;
        preloadedNextIndex.value = null;
        console.log(`✅ Usando video precargado`);
    } else {
        // Si no hay precarga, seleccionar random normalmente
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * tasksWithVideo.value.length);
        } while (newIndex === currentTaskIndex.value);

        previousIndex.value = currentTaskIndex.value;
        currentTaskIndex.value = newIndex;
    }
};

// Seleccionar la tarea actual y cerrar modal
const selectCurrentTask = () => {
    if (currentTask.value) {
        emit("select-task", currentTask.value);
        emit("close");
    }
};

// Cerrar modal
const closeModal = () => {
    emit("close");
};

// Cerrar con ESC
const handleKeydown = (e) => {
    if (e.key === "Escape") {
        closeModal();
    }
};

// Watch para precargar el siguiente video después de cargar el actual
watch(
    currentTaskIndex,
    async () => {
        // Esperar 2 segundos después de cambiar el video para precargar el siguiente
        await nextTick();
        setTimeout(() => {
            preloadNextVideo();
        }, 2000);
    },
    { immediate: false },
);

// Inicializar con tarea aleatoria al abrir
onMounted(() => {
    if (props.isOpen && tasksWithVideo.value.length > 0) {
        randomizeTask();
    }
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    // Limpiar elemento de precarga
    if (preloadElement.value) {
        preloadElement.value.src = "";
        preloadElement.value = null;
    }
});
</script>

<template>
    <Transition name="modal">
        <div v-if="isOpen" class="modal-overlay" @click="closeModal">
            <div class="modal-container" @click.stop>
                <!-- Header -->
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="modal-icon">🎬</span>
                        Álbum de Videos
                    </h2>
                    <button
                        class="close-btn"
                        @click="closeModal"
                        title="Cerrar (ESC)"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
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

                <!-- Content -->
                <div class="modal-content">
                    <!-- Estado vacío -->
                    <div v-if="tasksWithVideo.length === 0" class="empty-state">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                        >
                            <rect
                                x="2"
                                y="2"
                                width="20"
                                height="20"
                                rx="2.18"
                                ry="2.18"
                            />
                            <line x1="7" y1="2" x2="7" y2="22" />
                            <line x1="17" y1="2" x2="17" y2="22" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="2" y1="7" x2="7" y2="7" />
                            <line x1="2" y1="17" x2="7" y2="17" />
                            <line x1="17" y1="17" x2="22" y2="17" />
                            <line x1="17" y1="7" x2="22" y2="7" />
                        </svg>
                        <h3>No hay videos disponibles</h3>
                        <p>
                            Agrega la URL de un video en tus tareas para verlos
                            aquí
                        </p>
                    </div>

                    <!-- Video y detalles -->
                    <div v-else class="video-section">
                        <!-- Nombre de la tarea -->
                        <!-- <div class="task-info">
                            <h3 class="task-name">{{ currentTask.name }}</h3>
                            <span class="task-count">
                                {{ currentTaskIndex + 1 }} de
                                {{ tasksWithVideo.length }}
                            </span>
                        </div> -->

                        <!-- Video -->
                        <div class="album-video-container">
                            <video
                                v-if="currentTask.url_video"
                                :key="currentTask.id"
                                loop
                                muted
                                autoplay
                                playsinline
                                preload="metadata"
                                class="album-video"
                                controls
                            >
                                <source
                                    :src="currentTask.url_video"
                                    type="video/mp4"
                                />
                                Tu navegador no soporta la reproducción de
                                video.
                            </video>
                        </div>

                        <!-- Botones de acción -->
                        <div class="modal-actions">
                            <button
                                class="random-btn"
                                @click="randomizeTask"
                                :disabled="tasksWithVideo.length <= 1"
                                title="Ver otro video aleatorio"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline points="23 4 23 10 17 10" />
                                    <polyline points="1 20 1 14 7 14" />
                                    <path
                                        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                                    />
                                </svg>
                                Otro video
                            </button>
                            <button
                                class="select-btn"
                                @click="selectCurrentTask"
                                title="Cargar esta tarea para editar"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Seleccionar esta tarea
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Modal overlay */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
}

.modal-container {
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 800px;
    max-height: 96vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border-color);
}

/* Header */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.modal-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.modal-icon {
    font-size: 24px;
}

.close-btn {
    background: none;
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

/* Content */
.modal-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
}

/* Empty state */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-secondary);
}

.empty-state svg {
    opacity: 0.3;
    color: var(--text-secondary);
}

.empty-state h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.empty-state p {
    font-size: 14px;
    margin: 0;
    max-width: 300px;
}

/* Video section */
.video-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.task-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    gap: 12px; /* FIX: Espacio entre elementos */
    min-width: 0; /* FIX: Permite que el contenedor se encoja */
}

.task-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0; /* FIX: Permite que el flex item se encoja */
}

.task-count {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--hover-bg);
    padding: 4px 12px;
    border-radius: 20px;
    flex-shrink: 0;
    margin-left: 12px;
}

.album-video-container {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
}

.album-video {
    width: 100%;
    height: auto;
    display: block;
    max-height: 500px;
    object-fit: contain;
    background: #000;
}

/* Actions */
.modal-actions {
    display: flex;
    gap: 12px;
}

.random-btn,
.select-btn {
    flex: 1;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    border: none;
}

.random-btn {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.random-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--accent);
    transform: scale(1.02);
}

.random-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.select-btn {
    background: var(--accent);
    color: white;
}

.select-btn:hover {
    background: var(--accent-hover);
    transform: scale(1.02);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
    transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
    transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
    .modal-container {
        max-width: 95vw;
        max-height: 85vh;
    }

    .modal-header {
        padding: 16px 20px;
    }

    .modal-title {
        font-size: 18px;
    }

    .modal-content {
        padding: 20px;
    }

    .task-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 12px; /* FIX: Reducir padding en mobile */
    }

    .task-name {
        font-size: 16px; /* FIX: Reducir tamaño de fuente en mobile */
        width: 100%; /* FIX: Asegurar que use todo el ancho disponible */
    }

    .task-count {
        margin-left: 0;
        align-self: flex-end; /* FIX: Alinear a la derecha */
    }

    .album-video {
        max-height: 350px;
    }

    .modal-actions {
        flex-direction: column;
    }

    .random-btn,
    .select-btn {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .modal-overlay {
        padding: 10px;
    }

    .modal-header {
        padding: 12px 16px;
    }

    .modal-title {
        font-size: 16px;
    }

    .modal-icon {
        font-size: 20px;
    }

    .modal-content {
        padding: 16px;
    }

    .task-name {
        font-size: 16px;
    }

    /*.album-video {
        max-height: 250px;
    }*/

    .random-btn,
    .select-btn {
        padding: 12px 16px;
        font-size: 14px;
    }
}
</style>
