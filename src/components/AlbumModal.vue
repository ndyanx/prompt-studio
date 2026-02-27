<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import VideoPreview from "./VideoPreview.vue";
import { usePromptManager } from "../composables/usePromptManager";

const VITE_PROXY_API = import.meta.env.VITE_PROXY_API;

const { updateTaskVideoUrl } = usePromptManager();

const props = defineProps({
    tasks: Array,
    isOpen: Boolean,
});

const emit = defineEmits(["close", "select-task"]);

const currentTaskIndex = ref(0);
const previousIndex = ref(-1);
const preloadedNextIndex = ref(null);
const preloadElement = ref(null);

const isRandomizing = ref(false);
const cooldownSeconds = ref(0);
let cooldownInterval = null;

// Cache para evitar refiltrar el array completo en cada render
const tasksWithVideoCache = ref([]);
const lastTasksLength = ref(0);

// Cache para no repetir llamadas a la API por la misma URL
const hdCheckCache = new Map();

// Consulta la API para obtener la versión HD del video si existe.
// Actualiza la tarea en DB y el cache para evitar consultas repetidas.
const checkAndUpgradeToHD = async (url, task) => {
    if (!url || url.includes("_hd.mp4")) {
        return url;
    }

    if (hdCheckCache.has(url)) {
        return hdCheckCache.get(url);
    }

    if (!task.url_post || !task.url_post.trim()) {
        hdCheckCache.set(url, url);
        return url;
    }

    try {
        const postIdMatch = task.url_post.match(/\/post\/([a-f0-9-]+)/i);

        if (!postIdMatch || !postIdMatch[1]) {
            hdCheckCache.set(url, url);
            return url;
        }

        const postId = postIdMatch[1];

        const payload = {
            url: "https://grok.com/rest/media/post/get",
            method: "POST",
            impersonate: "chrome136",
            json: {
                id: postId,
            },
        };

        const response = await fetch(VITE_PROXY_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Error al obtener datos del post");
        }

        const responseData = await response.json();
        const data = JSON.parse(responseData.data);

        if (!data || !data.post) {
            throw new Error("Respuesta inválida del servidor");
        }

        const post = data.post;

        if (post.mediaType !== "MEDIA_POST_TYPE_VIDEO") {
            hdCheckCache.set(url, url);
            return url;
        }

        if (post.hdMediaUrl) {
            hdCheckCache.set(url, post.hdMediaUrl);
            await updateTaskVideoUrl(task.id, post.hdMediaUrl);
            return post.hdMediaUrl;
        } else {
            const videoUrl = post.mediaUrl || url;
            hdCheckCache.set(url, videoUrl);
            return videoUrl;
        }
    } catch (error) {
        hdCheckCache.set(url, url);
        return url;
    }
};

// Filtra las tareas que tienen video. Usa cache por longitud para evitar
// refiltrar cuando el array no ha cambiado.
const tasksWithVideo = computed(() => {
    if (
        props.tasks.length === lastTasksLength.value &&
        tasksWithVideoCache.value.length > 0
    ) {
        return tasksWithVideoCache.value;
    }

    const filtered = props.tasks.filter(
        (task) => task.url_video && task.url_video.trim() !== "",
    );

    tasksWithVideoCache.value = filtered;
    lastTasksLength.value = props.tasks.length;

    return filtered;
});

const currentTask = computed(() => {
    if (tasksWithVideo.value.length === 0) return null;
    return tasksWithVideo.value[currentTaskIndex.value];
});

const getRandomNextIndex = () => {
    if (tasksWithVideo.value.length <= 1) return null;

    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * tasksWithVideo.value.length);
    } while (newIndex === currentTaskIndex.value);

    return newIndex;
};

const preloadNextVideo = async () => {
    if (tasksWithVideo.value.length <= 1) return;

    const nextIndex = getRandomNextIndex();
    if (nextIndex === null) return;

    preloadedNextIndex.value = nextIndex;
    const nextTask = tasksWithVideo.value[nextIndex];

    const videoUrl = await checkAndUpgradeToHD(nextTask.url_video, nextTask);

    if (!preloadElement.value) {
        preloadElement.value = document.createElement("video");
        preloadElement.value.preload = "metadata";
        preloadElement.value.style.display = "none";
    }

    preloadElement.value.src = videoUrl;
};

const randomizeTask = () => {
    if (isRandomizing.value) return;
    if (tasksWithVideo.value.length === 0) return;

    if (tasksWithVideo.value.length === 1) {
        currentTaskIndex.value = 0;
        return;
    }

    isRandomizing.value = true;
    cooldownSeconds.value = 6;

    if (preloadedNextIndex.value !== null) {
        previousIndex.value = currentTaskIndex.value;
        currentTaskIndex.value = preloadedNextIndex.value;
        preloadedNextIndex.value = null;
    } else {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * tasksWithVideo.value.length);
        } while (newIndex === currentTaskIndex.value);

        previousIndex.value = currentTaskIndex.value;
        currentTaskIndex.value = newIndex;
    }

    cooldownInterval = setInterval(() => {
        cooldownSeconds.value--;

        if (cooldownSeconds.value <= 0) {
            clearInterval(cooldownInterval);
            isRandomizing.value = false;
            cooldownSeconds.value = 0;
        }
    }, 1000);
};

const selectCurrentTask = () => {
    if (currentTask.value) {
        emit("select-task", currentTask.value);
        emit("close");
    }
};

const closeModal = () => {
    emit("close");
};

const handleKeydown = (e) => {
    if (e.key === "Escape") {
        closeModal();
    }
};

// Precarga el siguiente video 2 segundos después de que cambia el actual,
// para que el usuario no espere al siguiente cambio.
watch(
    currentTaskIndex,
    async () => {
        await nextTick();
        setTimeout(() => {
            preloadNextVideo();
        }, 2000);
    },
    { immediate: false },
);

onMounted(() => {
    if (props.isOpen && tasksWithVideo.value.length > 0) {
        randomizeTask();
    }
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);

    if (cooldownInterval) {
        clearInterval(cooldownInterval);
    }

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
                                :disabled="
                                    tasksWithVideo.length <= 1 || isRandomizing
                                "
                                :title="
                                    isRandomizing
                                        ? `Espera ${cooldownSeconds}s`
                                        : 'Ver otro video aleatorio'
                                "
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
                                <span v-if="isRandomizing"
                                    >Espera {{ cooldownSeconds }}s</span
                                >
                                <span v-else>Otro video</span>
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
    /* backdrop-filter: blur(8px) eliminado — re-composición en cada paint */
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
    transition:
        background 0.2s,
        color 0.2s;
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
    transition:
        background 0.2s,
        border-color 0.2s,
        color 0.2s;
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
