<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useSyncStore } from "../stores/useSyncStore";
import { useAuthStore } from "../stores/useAuthStore";

const syncStore = useSyncStore();
const authStore = useAuthStore();

const {
    isOffline,
    isSyncingNow,
    syncError,
    pendingCount,
    hasPending,
    lastSyncTime,
} = storeToRefs(syncStore);

const { isAuthenticated, user } = storeToRefs(authStore);

const formatTime = (timestamp) => {
    if (!timestamp) return "Nunca";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (seconds < 60) return "Hace unos segundos";
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    return date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const syncStatus = computed(() => {
    if (!isAuthenticated.value) return "offline";
    if (isOffline.value) return "no-connection";
    if (isSyncingNow.value) return "syncing";
    if (syncError.value) return "error";
    if (hasPending.value) return "pending";
    return "synced";
});

const syncStatusText = computed(() => {
    switch (syncStatus.value) {
        case "offline":
            return "No autenticado";
        case "no-connection":
            return "Sin conexión";
        case "syncing":
            return "Sincronizando...";
        case "error":
            return "Error";
        case "pending":
            return `${pendingCount.value} pendiente${pendingCount.value > 1 ? "s" : ""}`;
        default:
            return "Al día";
    }
});

const showDetails = ref(false);

// Fix #5: computed en lugar de función en template — evita recalcular
// new Date() y aritmética en cada render aunque lastSyncTime no cambie.
const formattedLastSync = computed(() => formatTime(lastSyncTime.value));

// Fix #6: cerrar el panel al hacer click fuera del componente.
const handleClickOutside = (e) => {
    if (showDetails.value && !e.target.closest(".sync-status-container")) {
        showDetails.value = false;
    }
};

onMounted(() => document.addEventListener("click", handleClickOutside, true));
onUnmounted(() =>
    document.removeEventListener("click", handleClickOutside, true),
);
</script>

<template>
    <div class="sync-status-container">
        <!-- Fix #1: div → button con aria-label, aria-expanded, aria-controls -->
        <button
            class="sync-status"
            :class="syncStatus"
            :aria-label="`Estado de sincronización: ${syncStatusText}. Clic para ver detalles`"
            :aria-expanded="showDetails"
            :aria-controls="showDetails ? 'sync-details-panel' : undefined"
            @click="showDetails = !showDetails"
        >
            <!-- Fix #2: aria-hidden en todos los SVGs decorativos -->
            <!-- No autenticado -->
            <svg
                v-if="!isAuthenticated"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="2" x2="22" y2="22" />
            </svg>

            <!-- Sin conexión -->
            <svg
                v-else-if="isOffline"
                aria-hidden="true"
                class="wifi-off"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path
                    d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39"
                />
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>

            <!-- Sincronizando -->
            <svg
                v-else-if="isSyncingNow"
                aria-hidden="true"
                class="spinner"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>

            <!-- Error -->
            <svg
                v-else-if="syncError"
                aria-hidden="true"
                class="shake"
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

            <!-- Pendientes -->
            <svg
                v-else-if="hasPending"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>

            <!-- Al día -->
            <svg
                v-else
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path d="M20 6L9 17l-5-5" />
            </svg>
        </button>

        <Transition name="slide-fade">
            <!-- Fix #3: id + role="region" + aria-label en el panel -->
            <div
                v-if="showDetails"
                id="sync-details-panel"
                class="sync-details"
                role="region"
                aria-label="Detalles de sincronización"
            >
                <div class="sync-details-header">
                    <h3>Sincronización</h3>
                    <!-- Fix #4: aria-label en botón cerrar -->
                    <button
                        @click="showDetails = false"
                        class="close-details"
                        aria-label="Cerrar detalles de sincronización"
                    >
                        <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
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

                <div class="sync-details-content">
                    <div class="sync-info-item">
                        <span class="sync-label">Usuario:</span>
                        <span class="sync-value">{{
                            user?.email || "No autenticado"
                        }}</span>
                    </div>
                    <div class="sync-info-item">
                        <span class="sync-label">Última sync:</span>
                        <!-- Fix #5: usa computed en lugar de llamar formatTime() en template -->
                        <span class="sync-value">{{ formattedLastSync }}</span>
                    </div>
                    <div class="sync-info-item">
                        <span class="sync-label">Estado:</span>
                        <span class="sync-value" :class="syncStatus">{{
                            syncStatusText
                        }}</span>
                    </div>

                    <div v-if="isOffline" class="connection-warning">
                        <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
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
                        Sin conexión — los cambios se sincronizarán al
                        reconectar
                    </div>

                    <div
                        v-if="hasPending && !isOffline"
                        class="pending-warning"
                    >
                        <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {{ pendingCount }} cambio{{
                            pendingCount > 1 ? "s" : ""
                        }}
                        pendiente{{ pendingCount > 1 ? "s" : "" }} de
                        sincronizar
                    </div>

                    <div
                        v-if="syncError && !isOffline"
                        class="sync-error-message"
                    >
                        {{ syncError }}
                    </div>

                    <div v-if="isSyncingNow" class="syncing-message">
                        Sincronizando tus datos...
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.sync-status-container {
    position: relative;
}

.sync-status {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    /* Reset de estilos nativos de <button> */
    background: transparent;
    border: 2px solid transparent;
    padding: 0;
    font: inherit;
    outline: none;
    transition:
        background 0.3s ease,
        transform 0.3s ease,
        border-color 0.3s ease;
}
.sync-status:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
.sync-status:hover {
    transform: scale(1.1);
}

.sync-status.offline {
    background: rgba(142, 142, 147, 0.2);
    color: var(--text-secondary);
    border-color: var(--text-secondary);
}
.sync-status.no-connection {
    background: rgba(255, 149, 0, 0.2);
    color: #ff9500;
    border-color: #ff9500;
}
.sync-status.syncing {
    background: rgba(10, 132, 255, 0.2);
    color: var(--accent);
    border-color: var(--accent);
}
/* Fix #7: pulse solo en el SVG — animar el botón completo
   saturaba el compositor con repaints del borde en cada frame */
.sync-status.no-connection svg,
.sync-status.syncing svg {
    animation: pulse 2s infinite;
}
.sync-status.error {
    background: rgba(255, 59, 48, 0.2);
    color: #ff3b30;
    border-color: #ff3b30;
    animation: shake 0.5s;
}
.sync-status.pending {
    background: rgba(255, 149, 0, 0.2);
    color: #ff9500;
    border-color: #ff9500;
}
.sync-status.synced {
    background: rgba(48, 209, 88, 0.2);
    color: #30d158;
    border-color: #30d158;
}

.sync-details {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: var(--card-bg);
    border-radius: 12px;
    padding: 16px;
    min-width: 280px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-color);
    z-index: 1000;
}

.sync-details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
}
.sync-details-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-details {
    background: none;
    border: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        background 0.2s,
        color 0.2s;
}
.close-details:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.sync-details-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.sync-info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
.sync-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}
.sync-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: right;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sync-value.pending {
    color: #ff9500;
}
.sync-value.synced {
    color: #30d158;
}
.sync-value.error {
    color: #ff3b30;
}
.sync-value.syncing {
    color: var(--accent);
}
.sync-value.no-connection {
    color: #ff9500;
}

.connection-warning,
.pending-warning {
    font-size: 12px;
    color: #ff9500;
    padding: 10px;
    background: rgba(255, 149, 0, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 149, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
}
.sync-error-message {
    font-size: 12px;
    color: #ff3b30;
    padding: 10px;
    background: rgba(255, 59, 48, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 59, 48, 0.3);
}
.syncing-message {
    font-size: 12px;
    color: var(--accent);
    padding: 10px;
    background: rgba(10, 132, 255, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(10, 132, 255, 0.3);
    text-align: center;
    animation: pulse 2s infinite;
}

.wifi-off {
    animation: pulse 2s infinite;
}
.spinner {
    animation: spin 1s linear infinite;
}
.shake {
    animation: shake 0.5s;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}
@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(-5px);
    }
    75% {
        transform: translateX(5px);
    }
}

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.2s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 768px) {
    .sync-details {
        position: fixed;
        top: auto;
        bottom: 80px;
        left: 20px;
        right: 20px;
        width: auto;
        max-width: none;
        margin: 0;
    }
    .sync-status {
        width: 44px;
        height: 44px;
    }
}
</style>
