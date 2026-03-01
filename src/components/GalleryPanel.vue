<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

const props = defineProps({
    tasks: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["go-to-task"]);

// ─── Aplanar todos los videos de todas las tareas ─────────────────────────
const allVideos = computed(() => {
    const videos = [];
    props.tasks.forEach((task) => {
        if (!Array.isArray(task.media)) return;
        task.media.forEach((slot, slotIndex) => {
            if (slot.url_video) {
                videos.push({
                    id: `${task.id}-${slotIndex}`,
                    taskId: task.id,
                    taskName: task.name,
                    url_video: slot.url_video,
                    url_post: slot.url_post || "",
                    slotIndex,
                });
            }
        });
    });
    return videos;
});

const isEmpty = computed(() => allVideos.value.length === 0);

// ─── Estado de visibilidad por video (virtualización) ─────────────────────
// Guardamos aspect ratio para reservar espacio cuando el elemento no está en DOM
const aspectRatios = ref({}); // id → número (w/h)
const visibleIds = ref(new Set()); // ids actualmente observados como visibles

// ─── Modal ────────────────────────────────────────────────────────────────
const modalVideo = ref(null); // { id, taskId, taskName, url_video, url_post }
const modalVideoRef = ref(null);

const openModal = (video) => {
    modalVideo.value = video;
    document.body.style.overflow = "hidden";
    nextTick(() => {
        if (modalVideoRef.value) {
            modalVideoRef.value.play().catch(() => {});
        }
    });
};

const closeModal = () => {
    if (modalVideoRef.value) {
        modalVideoRef.value.pause();
    }
    modalVideo.value = null;
    document.body.style.overflow = "";
};

const handleGoToTask = () => {
    if (!modalVideo.value) return;
    emit("go-to-task", modalVideo.value.taskId);
    closeModal();
};

const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
};

// Cerrar modal con Escape
const handleKeydown = (e) => {
    if (e.key === "Escape" && modalVideo.value) closeModal();
};

// ─── IntersectionObserver para virtualización ─────────────────────────────
let observer = null;
const cardRefs = ref({});

const setCardRef = (el, id) => {
    if (el) {
        cardRefs.value[id] = el;
        if (observer) observer.observe(el);
    }
};

const initObserver = () => {
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const id = entry.target.dataset.videoid;
                if (!id) return;
                if (entry.isIntersecting) {
                    visibleIds.value.add(id);
                } else {
                    // Solo desmontamos si está muy lejos del viewport (rootMargin negativo)
                    visibleIds.value.delete(id);
                }
            });
        },
        {
            // Precargamos 400px antes/después del viewport para evitar flash al scrollear
            rootMargin: "400px 0px 400px 0px",
            threshold: 0,
        },
    );
};

const isVisible = (id) => visibleIds.value.has(id);

// Cuando el video carga metadatos, guardamos el aspect ratio
const handleMetadata = (e, id) => {
    const { videoWidth, videoHeight } = e.target;
    if (videoWidth && videoHeight) {
        aspectRatios.value[id] = videoWidth / videoHeight;
    }
};

// Calcula el padding-bottom para reservar espacio cuando el video no está visible
const getAspectStyle = (id) => {
    const ratio = aspectRatios.value[id];
    if (!ratio) return { paddingBottom: "177.78%" }; // default 9:16 (vertical)
    return { paddingBottom: `${(1 / ratio) * 100}%` };
};

onMounted(() => {
    initObserver();
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener("keydown", handleKeydown);
    document.body.style.overflow = "";
});
</script>

<template>
    <div class="gallery-root">
        <!-- Estado vacío -->
        <div v-if="isEmpty" class="gallery-empty">
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
            <p class="empty-title">Sin videos todavía</p>
            <p class="empty-sub">
                Agrega URLs de video en tus tareas para verlos aquí
            </p>
        </div>

        <!-- Grid de videos -->
        <div v-else class="gallery-grid">
            <div
                v-for="video in allVideos"
                :key="video.id"
                :ref="(el) => setCardRef(el, video.id)"
                :data-videoid="video.id"
                class="gallery-card"
                @click="openModal(video)"
            >
                <!-- Contenedor con aspect ratio reservado -->
                <div class="video-aspect" :style="getAspectStyle(video.id)">
                    <!-- Video real solo si está en viewport -->
                    <video
                        v-if="isVisible(video.id)"
                        class="gallery-video"
                        :src="video.url_video"
                        muted
                        loop
                        playsinline
                        autoplay
                        preload="metadata"
                        @loadedmetadata="handleMetadata($event, video.id)"
                        @mouseenter="(e) => e.target.play().catch(() => {})"
                        @mouseleave="
                            (e) => {
                                e.target.pause();
                                e.target.currentTime = 0;
                            }
                        "
                    />
                    <!-- Placeholder mientras no está visible -->
                    <div v-else class="video-placeholder-thumb" />
                </div>

                <!-- Overlay con nombre de tarea -->
                <div class="card-overlay">
                    <span class="card-task-name">{{ video.taskName }}</span>
                </div>
            </div>
        </div>

        <!-- Contador -->
        <div v-if="!isEmpty" class="gallery-footer">
            {{ allVideos.length }} video{{ allVideos.length !== 1 ? "s" : "" }}
        </div>

        <!-- Modal -->
        <Teleport to="body">
            <div
                v-if="modalVideo"
                class="modal-overlay"
                @click="handleModalOverlayClick"
            >
                <div class="modal-content">
                    <!-- Header del modal -->
                    <div class="modal-header">
                        <span class="modal-task-name">{{
                            modalVideo.taskName
                        }}</span>
                        <div class="modal-actions">
                            <button
                                class="modal-btn goto-btn"
                                @click="handleGoToTask"
                                title="Ir a la tarea"
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
                                title="Cerrar"
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

                    <!-- Video en modal -->
                    <div class="modal-video-wrapper">
                        <video
                            ref="modalVideoRef"
                            class="modal-video"
                            :src="modalVideo.url_video"
                            controls
                            loop
                            muted
                            playsinline
                            autoplay
                        />
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
/* ─── Raíz ─────────────────────────────────────────────────────────────── */
.gallery-root {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-primary);
    padding: 20px;
    box-sizing: border-box;
}

/* ─── Estado vacío ──────────────────────────────────────────────────────── */
.gallery-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--text-secondary);
    text-align: center;
    padding: 40px;
}

.empty-icon {
    opacity: 0.25;
    margin-bottom: 8px;
}

.empty-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
}

.empty-sub {
    font-size: 13px;
    max-width: 280px;
    line-height: 1.5;
}

/* ─── Grid de columnas ──────────────────────────────────────────────────── */
.gallery-grid {
    columns: 4;
    column-gap: 10px;
}

/* ─── Tarjeta ───────────────────────────────────────────────────────────── */
.gallery-card {
    position: relative;
    break-inside: avoid;
    margin-bottom: 10px;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}

.gallery-card:hover {
    transform: scale(1.015);
    box-shadow: var(--shadow-lg);
    border-color: transparent;
}

.gallery-card:hover .card-overlay {
    opacity: 1;
}

/* ─── Aspect ratio wrapper ──────────────────────────────────────────────── */
.video-aspect {
    position: relative;
    width: 100%;
    height: 0; /* el padding-bottom lo controla */
}

.gallery-video,
.video-placeholder-thumb {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.video-placeholder-thumb {
    background: var(--bg-secondary);
}

/* ─── Overlay nombre de tarea ───────────────────────────────────────────── */
.card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 28px 12px 10px;
    background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.7) 0%,
        transparent 100%
    );
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
}

.card-task-name {
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
}

/* ─── Footer contador ───────────────────────────────────────────────────── */
.gallery-footer {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 20px 0 10px;
}

/* ─── Modal overlay ─────────────────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.18s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* ─── Modal contenido ───────────────────────────────────────────────────── */
.modal-content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(92vw, 900px);
    max-height: 92vh;
    width: 100%;
    animation: slideUp 0.2s ease;
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

/* ─── Modal header ──────────────────────────────────────────────────────── */
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

.goto-btn {
    background: var(--accent);
    color: #fff;
}

.goto-btn:hover {
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

/* ─── Modal video ───────────────────────────────────────────────────────── */
.modal-video-wrapper {
    border-radius: 14px;
    overflow: hidden;
    background: #000;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-video {
    width: 100%;
    height: 100%;
    max-height: calc(92vh - 60px);
    object-fit: contain;
    display: block;
}

/* ─── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
    .gallery-root {
        padding: 12px;
    }

    .gallery-grid {
        columns: 1;
    }

    .modal-overlay {
        padding: 12px;
        align-items: center;
    }

    .modal-content {
        max-height: 95vh;
    }

    .modal-video {
        max-height: calc(95vh - 60px);
    }
}
</style>
