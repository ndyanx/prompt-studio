<script setup>
import { ref, watch, nextTick } from "vue";

const VITE_PROXY_API = import.meta.env.VITE_PROXY_API;

const props = defineProps({
    urlPost: String,
    urlVideo: String,
    isVisible: Boolean,
});

const emit = defineEmits(["update-urls"]);

const localUrlPost = ref(props.urlPost || "");
const localUrlVideo = ref(props.urlVideo || "");
const videoRef = ref(null);
const isExpanded = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

// Sincronizar con props cuando cambian
watch(
    () => props.urlPost,
    (newUrl) => {
        localUrlPost.value = newUrl || "";
    },
);

watch(
    () => props.urlVideo,
    (newUrl) => {
        localUrlVideo.value = newUrl || "";
    },
);

// Actualizar video cuando cambia la URL del video
watch(localUrlVideo, async (newUrl) => {
    if (videoRef.value && newUrl) {
        errorMessage.value = "";
        await nextTick();
        videoRef.value.load();
    }
});

const handleLoaded = () => {
    if (videoRef.value) {
        videoRef.value.play().catch(() => {
            // Si el navegador bloquea autoplay, no rompe nada
        });
    }
};

const extractVideoUrl = async (postUrl) => {
    if (!postUrl.trim()) {
        localUrlVideo.value = "";
        errorMessage.value = "";
        return;
    }

    isLoading.value = true;
    errorMessage.value = "";

    try {
        const payload = {
            url: postUrl,
            method: "GET",
            impersonate: "chrome136",
        };

        const response = await fetch(VITE_PROXY_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Error al obtener el contenido del post");
        }

        const data = await response.json();

        // Decodificar HTML entities
        const htmlContent = data.data
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#39;/g, "'");

        // Buscar el meta tag og:video usando regex
        const ogVideoMatch =
            htmlContent.match(
                /<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["']/i,
            ) ||
            htmlContent.match(
                /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:video["']/i,
            );

        if (ogVideoMatch && ogVideoMatch[1]) {
            localUrlVideo.value = ogVideoMatch[1];
            emit("update-urls", {
                url_post: postUrl,
                url_video: ogVideoMatch[1],
            });
        } else {
            errorMessage.value = "No se encontró video en este post";
            localUrlVideo.value = "";
            emit("update-urls", { url_post: postUrl, url_video: "" });
        }
    } catch (error) {
        console.error("Error extracting video URL:", error);
        errorMessage.value =
            "Error al extraer el video. Verifica la URL del post.";
        localUrlVideo.value = "";
        emit("update-urls", { url_post: postUrl, url_video: "" });
    } finally {
        isLoading.value = false;
    }
};

const handleUrlInput = (event) => {
    const newUrl = event.target.value;
    localUrlPost.value = newUrl;
};

const handleExtractVideo = () => {
    extractVideoUrl(localUrlPost.value);
};

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};

const handleVideoError = () => {
    errorMessage.value = "Error al cargar el video";
};
</script>

<template>
    <div v-if="isVisible" class="video-preview-section">
        <div class="video-header">
            <span class="video-title">Vista Previa de Video</span>
        </div>

        <div class="url-input-container">
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
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                />
                <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                />
            </svg>
            <input
                type="text"
                :value="localUrlPost"
                @input="handleUrlInput"
                placeholder="URL del post..."
                class="url-input"
            />
            <button
                @click="handleExtractVideo"
                class="extract-btn"
                :disabled="!localUrlPost.trim() || isLoading"
                :title="isLoading ? 'Extrayendo...' : 'Extraer video'"
            >
                <svg
                    v-if="!isLoading"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <svg
                    v-else
                    class="spinner"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
            </button>
        </div>

        <div v-if="localUrlVideo" class="video-url-display">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="video-url-text">{{ localUrlVideo }}</span>
        </div>

        <div v-if="errorMessage" class="error-message">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {{ errorMessage }}
        </div>

        <div
            v-if="localUrlVideo"
            class="video-container"
            :class="{ expanded: isExpanded }"
        >
            <button
                @click="toggleExpand"
                class="expand-btn-overlay"
                :class="{ expanded: isExpanded }"
                :title="isExpanded ? 'Contraer' : 'Expandir'"
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
                    <path
                        v-if="!isExpanded"
                        d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                    />
                    <path
                        v-else
                        d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
                    />
                </svg>
            </button>
            <video
                ref="videoRef"
                loop
                muted
                playsinline
                preload="metadata"
                class="video-player"
                controls
                @loadeddata="handleLoaded"
                @error="handleVideoError"
            >
                <source :src="localUrlVideo" type="video/mp4" />
                Tu navegador no soporta la reproducción de video.
            </video>
        </div>

        <div v-else-if="!isLoading" class="video-placeholder">
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
            <p>
                Ingresa la URL del post y presiona el botón para extraer el
                video
            </p>
        </div>
    </div>
</template>

<style scoped>
.video-preview-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
}

.video-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 15px;
    color: var(--text-primary);
}

.video-title {
    display: flex;
    align-items: center;
    gap: 6px;
}

.expand-btn-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: white;
    z-index: 10;
    opacity: 0.7;
}

.expand-btn-overlay:hover {
    background: rgba(10, 132, 255, 0.8);
    border-color: rgba(10, 132, 255, 0.5);
    opacity: 1;
    transform: scale(1.1);
}

.expand-btn-overlay.expanded {
    top: 20px;
    right: 20px;
    padding: 12px;
}

.expand-btn-overlay.expanded:hover {
    background: rgba(255, 59, 48, 0.8);
    border-color: rgba(255, 59, 48, 0.5);
}

.url-input-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    margin-bottom: 10px;
    transition: all 0.2s;
}

.url-input-container:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.url-input-container svg:first-child {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.url-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 13px;
    color: var(--text-primary);
    font-family: inherit;
    min-width: 0;
}

.url-input::placeholder {
    color: var(--text-secondary);
}

.extract-btn {
    background: var(--accent);
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: white;
    flex-shrink: 0;
}

.extract-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: scale(1.05);
}

.extract-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.video-url-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(10, 132, 255, 0.1);
    border: 1px solid rgba(10, 132, 255, 0.3);
    border-radius: 8px;
    margin-bottom: 10px;
    font-size: 11px;
    color: var(--accent);
}

.video-url-display svg {
    flex-shrink: 0;
}

.video-url-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    border-radius: 8px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #ff3b30;
}

.dark-theme .error-message {
    background: rgba(255, 69, 58, 0.15);
    border-color: rgba(255, 69, 58, 0.4);
    color: #ff453a;
}

.video-container {
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    position: relative;
}

.video-container.expanded {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 1200px;
    height: auto;
    max-height: 90vh;
    z-index: 1000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.video-player {
    width: 100%;
    height: auto;
    display: block;
    max-height: 400px;
    object-fit: contain;
}

.video-container.expanded .video-player {
    max-height: 90vh;
}

.video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    background: var(--bg-secondary);
    border-radius: 10px;
    border: 1px dashed var(--border-color);
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
}

.video-placeholder svg {
    opacity: 0.3;
}

.video-placeholder p {
    font-weight: 500;
}

/* Overlay para modo expandido */
.video-container.expanded::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: -1;
}

@media (max-width: 768px) {
    .video-preview-section {
        margin-top: 16px;
        padding-top: 16px;
    }

    .video-player {
        max-height: 250px;
    }

    .video-container.expanded {
        width: 95vw;
        max-height: 80vh;
    }

    .video-container.expanded .video-player {
        max-height: 80vh;
    }

    .video-placeholder {
        padding: 30px 15px;
    }

    .video-placeholder svg {
        width: 36px;
        height: 36px;
    }

    .video-placeholder p {
        font-size: 13px;
    }

    .url-input {
        font-size: 12px;
    }

    .extract-btn {
        padding: 6px 10px;
    }
}

@media (max-width: 480px) {
    .video-player {
        max-height: 200px;
    }

    .url-input-container {
        padding: 8px 12px;
    }

    .url-input {
        font-size: 11px;
    }

    .extract-btn {
        padding: 6px 8px;
    }

    .video-url-display {
        font-size: 10px;
        padding: 6px 10px;
    }

    .error-message {
        font-size: 11px;
        padding: 8px 10px;
    }
}
</style>
