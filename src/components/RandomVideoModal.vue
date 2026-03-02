<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { usePromptStore } from "../stores/usePromptStore";

const promptStore = usePromptStore();

const props = defineProps({
    tasks: Array,
    isOpen: Boolean,
});

const emit = defineEmits(["close", "select-task"]);

const currentTaskIndex = ref(0);
const preloadedNextIndex = ref(null);
const preloadElement = ref(null);

const isRandomizing = ref(false);
const cooldownSeconds = ref(0);
let cooldownInterval = null;

const tasksWithVideoCache = ref([]);
const lastTasksLength = ref(0);

const tasksWithVideo = computed(() => {
    if (
        props.tasks.length === lastTasksLength.value &&
        tasksWithVideoCache.value.length > 0
    ) {
        return tasksWithVideoCache.value;
    }

    const filtered = props.tasks
        .map((task) => {
            if (!Array.isArray(task.media)) {
                return {
                    ...task,
                    media: [
                        {
                            url_post: task.url_post || "",
                            url_video: task.url_video || "",
                        },
                    ],
                };
            }
            return task;
        })
        .filter((task) =>
            task.media.some((m) => m.url_video && m.url_video.trim() !== ""),
        );

    tasksWithVideoCache.value = filtered;
    lastTasksLength.value = props.tasks.length;

    return filtered;
});

const currentTask = computed(() => {
    if (tasksWithVideo.value.length === 0) return null;
    const task = tasksWithVideo.value[currentTaskIndex.value];
    if (!task) return null;

    const validSlots = task.media.filter(
        (m) => m.url_video && m.url_video.trim() !== "",
    );
    if (validSlots.length === 0) return null;

    const slot = validSlots[Math.floor(Math.random() * validSlots.length)];
    return { ...task, _activeSlot: slot };
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

    const nextSlots = nextTask.media.filter(
        (m) => m.url_video && m.url_video.trim() !== "",
    );
    if (nextSlots.length === 0) return;
    const nextSlot = nextSlots[Math.floor(Math.random() * nextSlots.length)];

    if (!preloadElement.value) {
        preloadElement.value = document.createElement("video");
        preloadElement.value.preload = "metadata";
        preloadElement.value.style.display = "none";
    }
    preloadElement.value.src = nextSlot.url_video;
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
        currentTaskIndex.value = preloadedNextIndex.value;
        preloadedNextIndex.value = null;
    } else {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * tasksWithVideo.value.length);
        } while (newIndex === currentTaskIndex.value);
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
    window.dispatchEvent(new CustomEvent("random-modal-close"));
    emit("close");
};

const handleKeydown = (e) => {
    if (e.key === "Escape") closeModal();
};

watch(
    currentTaskIndex,
    async () => {
        await nextTick();
        setTimeout(() => preloadNextVideo(), 2000);
    },
    { immediate: false },
);

onMounted(() => {
    if (props.isOpen && tasksWithVideo.value.length > 0) {
        randomizeTask();
        window.dispatchEvent(new CustomEvent("random-modal-open"));
    }
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    if (cooldownInterval) clearInterval(cooldownInterval);
    if (preloadElement.value) {
        preloadElement.value.src = "";
        preloadElement.value = null;
    }
});
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen" class="modal-overlay" @click="closeModal">
                <div class="modal-content" @click.stop>
                    <!-- Estado vacío -->
                    <div v-if="tasksWithVideo.length === 0" class="empty-state">
                        <div class="empty-icon">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                            >
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        </div>
                        <p class="empty-title">No hay videos disponibles</p>
                        <p class="empty-sub">
                            Agrega la URL de un video en tus tareas para verlos
                            aquí
                        </p>
                    </div>

                    <!-- Video -->
                    <template v-else>
                        <div class="modal-header">
                            <span class="modal-task-name">{{
                                currentTask?.name
                            }}</span>
                            <div class="modal-actions">
                                <button
                                    class="modal-btn random-btn"
                                    @click="randomizeTask"
                                    :disabled="
                                        tasksWithVideo.length <= 1 ||
                                        isRandomizing
                                    "
                                    :title="
                                        isRandomizing
                                            ? `Espera ${cooldownSeconds}s`
                                            : 'Ver otro video aleatorio'
                                    "
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="15"
                                        height="15"
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
                                        >{{ cooldownSeconds }}s</span
                                    >
                                    <span v-else>Otro video</span>
                                </button>
                                <button
                                    class="modal-btn select-btn"
                                    @click="selectCurrentTask"
                                    title="Cargar esta tarea para editar"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                                        />
                                    </svg>
                                    Ir a tarea
                                </button>
                                <button
                                    class="modal-btn close-btn"
                                    @click="closeModal"
                                    title="Cerrar (ESC)"
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
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div
                            class="modal-video-wrapper"
                            :style="
                                currentTask?._activeSlot?.width &&
                                currentTask?._activeSlot?.height
                                    ? {
                                          aspectRatio: `${currentTask._activeSlot.width} / ${currentTask._activeSlot.height}`,
                                      }
                                    : {}
                            "
                        >
                            <video
                                v-if="currentTask?._activeSlot?.url_video"
                                :key="
                                    currentTask.id +
                                    '-' +
                                    currentTask._activeSlot.url_video
                                "
                                class="modal-video"
                                :src="currentTask._activeSlot.url_video"
                                controls
                                loop
                                muted
                                autoplay
                                playsinline
                                preload="metadata"
                            />
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* ─── Overlay ───────────────────────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

/* ─── Contenedor flotante (sin borde de caja) ───────────────────────────── */
.modal-content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(92vw, 900px);
    max-height: 92vh;
    width: 100%;
    /* contain:layout aísla el reflow sin colapsar la altura del contenedor */
    contain: layout;
}

/* ─── Estado vacío ──────────────────────────────────────────────────────── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 40px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    background: var(--bg-primary);
    border-radius: 14px;
}
.empty-icon {
    opacity: 0.25;
    margin-bottom: 8px;
    color: #fff;
}
.empty-title {
    font-size: 17px;
    font-weight: 600;
    color: #fff;
    margin: 0;
}
.empty-sub {
    font-size: 13px;
    max-width: 280px;
    line-height: 1.5;
    margin: 0;
}

/* ─── Header ────────────────────────────────────────────────────────────── */
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px 2px;
    flex-shrink: 0;
}
.modal-task-name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    margin-right: 12px;
}
.modal-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

/* ─── Botones ───────────────────────────────────────────────────────────── */
.modal-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    transition:
        background 0.15s ease,
        transform 0.15s ease;
}

.random-btn {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
}
.random-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.22);
    transform: scale(1.03);
}
.random-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.select-btn {
    background: var(--accent);
    color: #fff;
}
.select-btn:hover {
    background: var(--accent-hover);
    transform: scale(1.03);
}

.close-btn {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    padding: 7px;
}
.close-btn:hover {
    background: rgba(255, 59, 48, 0.7);
}

/* ─── Video ─────────────────────────────────────────────────────────────── */
.modal-video-wrapper {
    border-radius: 14px;
    overflow: hidden;
    background: #000;
    flex: 1;
    min-height: 0;
    /*
       aspect-ratio viene dinámico desde :style con las dimensiones reales del video.
       Fallback: 16/9 para videos sin dimensiones guardadas aún.
       El video absoluto llena el wrapper exacto → sin barras negras.
    */
    aspect-ratio: 16 / 9;
    position: relative;
}
.modal-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

/* ─── Transitions ───────────────────────────────────────────────────────── */
.modal-enter-active {
    animation: fadeIn 0.22s ease;
}
.modal-leave-active {
    animation: fadeIn 0.18s ease reverse;
}
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal-enter-active .modal-content {
    animation: slideUp 0.22s ease;
}
.modal-leave-active .modal-content {
    animation: slideUp 0.18s ease reverse;
}
@keyframes slideUp {
    from {
        transform: translateY(16px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* ─── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
    .modal-overlay {
        padding: 12px;
    }
    .modal-content {
        max-width: 100%;
        max-height: 95vh;
    }
    .modal-video-wrapper {
        border-radius: 10px;
    }
    .modal-task-name {
        font-size: 13px;
    }
    .modal-btn {
        padding: 6px 11px;
        font-size: 12px;
    }
    .close-btn {
        padding: 6px;
    }
}
</style>
