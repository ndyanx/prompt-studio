<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { usePromptStore } from "../stores/usePromptStore";

const props = defineProps({
    tasks: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["go-to-task"]);
const promptStore = usePromptStore();

// ─── Aplanar y ordenar videos ─────────────────────────────────────────────
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
                    width: slot.width || null,
                    height: slot.height || null,
                    createdAt: task.createdAt,
                });
            }
        });
    });
    videos.sort((a, b) => b.createdAt - a.createdAt);
    return videos;
});

const isEmpty = computed(() => allVideos.value.length === 0);

// ─── Renderizado progresivo ───────────────────────────────────────────────
// Con 1000 videos, montar 1000 nodos de golpe bloquea el hilo principal.
// Empezamos renderizando los primeros INITIAL_RENDER videos (los visibles
// inmediatamente) y vamos añadiendo BATCH_SIZE más en cada frame idle
// hasta renderizar todos. El usuario ve contenido inmediato y el resto
// aparece suavemente mientras el browser tiene tiempo libre.
const INITIAL_RENDER = 20; // suficiente para llenar la pantalla inicial
const BATCH_SIZE = 20; // cuántos añadir por frame idle
const renderedCount = ref(INITIAL_RENDER);
let idleCallbackId = null;

const scheduleProgressiveRender = () => {
    if (renderedCount.value >= allVideos.value.length) return;

    const tick = () => {
        renderedCount.value = Math.min(
            renderedCount.value + BATCH_SIZE,
            allVideos.value.length,
        );
        if (renderedCount.value < allVideos.value.length) {
            idleCallbackId = requestIdleCallback(tick, { timeout: 300 });
        }
    };

    idleCallbackId = requestIdleCallback(tick, { timeout: 300 });
};

// Cuando cambia allVideos (nueva tarea añadida, etc.) reiniciamos
watch(
    allVideos,
    () => {
        if (idleCallbackId) cancelIdleCallback(idleCallbackId);
        renderedCount.value = INITIAL_RENDER;
        scheduleProgressiveRender();
    },
    { flush: "post" },
);

// ─── Distribución horizontal en columnas ──────────────────────────────────
const columns = computed(() => {
    const cols = colCount.value;
    const result = Array.from({ length: cols }, () => []);
    // Solo distribuimos los videos ya renderizados
    allVideos.value.slice(0, renderedCount.value).forEach((video, i) => {
        result[i % cols].push(video);
    });
    return result;
});

// ─── Aspect ratio ─────────────────────────────────────────────────────────
const runtimeRatios = ref({});

const getCardAspect = (video) => {
    if (video.width && video.height) return `${video.width} / ${video.height}`;
    if (runtimeRatios.value[video.id])
        return `${runtimeRatios.value[video.id]} / 1`;
    return "9 / 16";
};

// ─── Metadata handler ─────────────────────────────────────────────────────
const handleMetadata = (e, video) => {
    const { videoWidth, videoHeight } = e.target;
    if (!videoWidth || !videoHeight) return;
    e.target.play().catch(() => {});
    if (video.width && video.height) return;
    runtimeRatios.value[video.id] = videoWidth / videoHeight;
    promptStore.updateMediaDimensions(
        video.taskId,
        video.slotIndex,
        videoWidth,
        videoHeight,
    );
};

// ─── Columnas responsivas via ResizeObserver ──────────────────────────────
const rootRef = ref(null);
const colCount = ref(5);

const getColsForWidth = (width) => {
    if (width < 500) return 1;
    if (width < 750) return 2;
    if (width < 1050) return 3;
    if (width < 1400) return 4;
    return 5;
};

let resizeObserver = null;

const initResizeObserver = () => {
    if (!rootRef.value) return;
    const initialWidth = rootRef.value.offsetWidth || window.innerWidth;
    colCount.value = getColsForWidth(initialWidth);
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const width = entry.contentRect.width;
            if (width > 0) colCount.value = getColsForWidth(width);
        }
    });
    resizeObserver.observe(rootRef.value);
};

// ─── IntersectionObserver ─────────────────────────────────────────────────
// visibleMap: objeto plano { [id]: true } para ids visibles.
// NO usamos Set porque Vue no detecta mutaciones de Set limpiamente.
// NO hacemos spread por cada entry — procesamos el batch completo de una vez
// y hacemos UNA SOLA asignación a visibleMap.value por callback.
// Con 400 videos y scroll rápido el callback puede llegar con 30+ entries;
// hacer 30 spreads + 30 renders sería muy costoso.
const visibleMap = ref({});
const videoEls = {};

const setCardRef = (el, id) => {
    if (el) intersectionObserver?.observe(el);
};

const setVideoRef = (el, id) => {
    if (el) videoEls[id] = el;
    else delete videoEls[id];
};

const isVisible = (id) => !!visibleMap.value[id];

let intersectionObserver = null;

const initIntersectionObserver = () => {
    intersectionObserver = new IntersectionObserver(
        (entries) => {
            // Copia el mapa actual una sola vez
            const next = { ...visibleMap.value };
            let changed = false;

            entries.forEach((entry) => {
                const id = entry.target.dataset.videoid;
                if (!id) return;

                if (entry.isIntersecting) {
                    if (!next[id]) {
                        next[id] = true;
                        changed = true;
                    }
                    if (!modalVideo.value) {
                        videoEls[id]?.play().catch(() => {});
                    }
                } else {
                    if (next[id]) {
                        delete next[id];
                        changed = true;
                    }
                    videoEls[id]?.pause();
                }
            });

            // Una sola asignación reactiva por batch → un solo render de Vue
            if (changed) visibleMap.value = next;
        },
        { rootMargin: "200px 0px 200px 0px", threshold: 0 },
    );
};

// ─── Modal ────────────────────────────────────────────────────────────────
const modalVideo = ref(null);
const modalVideoRef = ref(null);

const pauseAllGridVideos = () => {
    Object.values(videoEls).forEach((el) => el?.pause());
};

const resumeVisibleGridVideos = () => {
    const ids = Object.keys(visibleMap.value);
    let i = 0;
    // Reanudar en batches idle para no bloquear el frame del click de cierre.
    const playNext = (deadline) => {
        while (i < ids.length && deadline.timeRemaining() > 0) {
            videoEls[ids[i]]?.play().catch(() => {});
            i++;
        }
        if (i < ids.length) requestIdleCallback(playNext);
    };
    requestIdleCallback(playNext);
};

const openModal = (video) => {
    modalVideo.value = video;
    document.body.style.overflow = "hidden";
    // Diferir al siguiente task: el browser pinta el modal primero,
    // luego pausa los videos del grid sin bloquear el frame del click.
    setTimeout(() => {
        pauseAllGridVideos();
        nextTick(() => modalVideoRef.value?.play().catch(() => {}));
    }, 0);
};

const closeModal = () => {
    modalVideoRef.value?.pause();
    modalVideo.value = null;
    document.body.style.overflow = "";
    // Diferir la reanudación al siguiente task idle.
    setTimeout(() => resumeVisibleGridVideos(), 0);
};

const handleGoToTask = () => {
    if (!modalVideo.value) return;
    emit("go-to-task", modalVideo.value.taskId);
    closeModal();
};

const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
};

const handleKeydown = (e) => {
    if (e.key === "Escape" && modalVideo.value) closeModal();
};

// ─── Lifecycle ────────────────────────────────────────────────────────────
onMounted(() => {
    scheduleProgressiveRender();
    initIntersectionObserver();
    window.addEventListener("keydown", handleKeydown);
    nextTick(initResizeObserver);
});

onUnmounted(() => {
    if (idleCallbackId) cancelIdleCallback(idleCallbackId);
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("keydown", handleKeydown);
    document.body.style.overflow = "";
});
</script>

<template>
    <div ref="rootRef" class="gallery-root">
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

        <!-- Grid masonry -->
        <!-- El fondo desaparece con un overlay ::after en lugar de filter en el grid.
             filter obliga al browser a repintar TODOS los hijos en cada frame — muy costoso.
             El overlay es una capa independiente que el compositor maneja en GPU. -->
        <div
            v-else
            class="gallery-masonry"
            :class="{ 'modal-open': modalVideo }"
        >
            <div
                v-for="(col, colIndex) in columns"
                :key="colIndex"
                class="gallery-column"
            >
                <div
                    v-for="video in col"
                    :key="video.id"
                    :ref="(el) => setCardRef(el, video.id)"
                    :data-videoid="video.id"
                    class="gallery-card"
                    :style="{ aspectRatio: getCardAspect(video) }"
                    @click="openModal(video)"
                >
                    <video
                        v-if="isVisible(video.id)"
                        :ref="(el) => setVideoRef(el, video.id)"
                        class="gallery-video"
                        :src="video.url_video"
                        muted
                        loop
                        playsinline
                        autoplay
                        preload="none"
                        @loadedmetadata="handleMetadata($event, video)"
                    />
                    <div v-else class="video-placeholder" />

                    <div class="card-overlay">
                        <span class="card-task-name">{{ video.taskName }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contador -->
        <div
            v-if="!isEmpty"
            class="gallery-footer"
            :class="{ 'modal-open': modalVideo }"
        >
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
                    <div class="modal-header">
                        <span class="modal-task-name">{{
                            modalVideo.taskName
                        }}</span>
                        <div class="modal-actions">
                            <button
                                class="modal-btn goto-btn"
                                @click="handleGoToTask"
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
.gallery-root {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-primary);
    padding: 20px;
    box-sizing: border-box;
    /* Oculta la scrollbar visualmente pero mantiene el scroll funcional */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE / Edge legacy */
}
.gallery-root::-webkit-scrollbar {
    display: none; /* Chrome / Safari / Opera */
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

/* ─── Masonry ───────────────────────────────────────────────────────────── */
.gallery-masonry {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    /* Sin transition aquí — filter/opacity en el grid completo es muy costoso */
    position: relative;
}

/*
   Overlay oscuro al abrir modal.
   Usamos ::after en lugar de filter/opacity sobre el grid:
   - filter repinta TODOS los hijos en cada frame de animación → bloquea el hilo principal
   - ::after es una capa independiente → el compositor la anima en GPU sin tocar los hijos
*/
.gallery-masonry::after {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    pointer-events: none;
    z-index: 1999; /* justo debajo del modal (2000) */
    transition: background 0.25s ease;
}
.gallery-masonry.modal-open::after {
    background: rgba(0, 0, 0, 0.75);
    pointer-events: auto;
}
.gallery-masonry.modal-open {
    pointer-events: none;
}

.gallery-footer.modal-open {
    opacity: 0;
    transition: opacity 0.25s ease;
}

.gallery-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* ─── Tarjeta ───────────────────────────────────────────────────────────── */
.gallery-card {
    position: relative;
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    flex-shrink: 0;
    /*
       will-change promueve cada card a su propia capa de composición.
       El hover:scale no afecta al layout de sus hermanos y el browser
       no necesita recalcular paint para el resto del grid.
    */
    will-change: transform;
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

/* ─── Video y placeholder ───────────────────────────────────────────────── */
.gallery-video,
.video-placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.video-placeholder {
    background: var(--bg-secondary);
}

/* ─── Overlay nombre ────────────────────────────────────────────────────── */
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

/* ─── Footer ────────────────────────────────────────────────────────────── */
.gallery-footer {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 20px 0 10px;
    transition: opacity 0.25s ease;
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.22s ease;
}
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal-content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(92vw, 900px);
    max-height: 92vh;
    width: 100%;
    animation: slideUp 0.22s ease;
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
    max-height: calc(80vh - 60px);
    object-fit: contain;
    display: block;
}

@media (max-width: 600px) {
    .gallery-root {
        padding: 12px;
    }
    .modal-overlay {
        padding: 12px;
    }
    .modal-content {
        max-height: 95vh;
    }
    .modal-video {
        max-height: calc(95vh - 60px);
    }
}
</style>
