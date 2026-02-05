<script setup>
import { computed, ref } from "vue";
import { useSyncManager } from "../composables/useSyncManager";
import { useAuth } from "../composables/useAuth";

const { lastSyncTime, isSyncingNow, syncError, manualSync } = useSyncManager();
const { user, isAuthenticated } = useAuth();

const showSyncDetails = ref(false);

const formatTime = (timestamp) => {
    if (!timestamp) return "Nunca";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return "Hace unos segundos";
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;

    return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const syncStatus = computed(() => {
    if (!isAuthenticated.value) return "offline";
    if (isSyncingNow.value) return "syncing";
    if (syncError.value) return "error";
    return "synced";
});

const handleManualSync = async () => {
    await manualSync();
    showSyncDetails.value = false;
};
</script>

<template>
    <div class="sync-status-container">
        <div
            class="sync-status"
            :class="syncStatus"
            @click="showSyncDetails = !showSyncDetails"
            :title="
                isAuthenticated ? 'Estado de sincronización' : 'No autenticado'
            "
        >
            <svg
                v-if="!isAuthenticated"
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

            <svg
                v-else-if="isSyncingNow"
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

            <svg
                v-else-if="syncError"
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

            <svg
                v-else
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
        </div>

        <Transition name="slide-fade">
            <div v-if="showSyncDetails" class="sync-details">
                <div class="sync-details-header">
                    <h3>Estado de Sincronización</h3>
                    <button
                        @click="showSyncDetails = false"
                        class="close-details"
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
                        <span class="sync-value">{{
                            formatTime(lastSyncTime)
                        }}</span>
                    </div>

                    <div class="sync-info-item">
                        <span class="sync-label">Estado:</span>
                        <span class="sync-value" :class="syncStatus">
                            {{
                                syncStatus === "offline"
                                    ? "Offline"
                                    : syncStatus === "syncing"
                                      ? "Sincronizando..."
                                      : syncStatus === "error"
                                        ? "Error"
                                        : "Sincronizado"
                            }}
                        </span>
                    </div>

                    <div v-if="syncError" class="sync-error-message">
                        {{ syncError }}
                    </div>

                    <button
                        v-if="isAuthenticated && !isSyncingNow"
                        @click="handleManualSync"
                        class="manual-sync-btn"
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
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Sincronizar ahora
                    </button>
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
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.sync-status:hover {
    transform: scale(1.1);
}

.sync-status.offline {
    background: rgba(142, 142, 147, 0.2);
    color: var(--text-secondary);
    border-color: var(--text-secondary);
}

.sync-status.syncing {
    background: rgba(10, 132, 255, 0.2);
    color: var(--accent);
    border-color: var(--accent);
    animation: pulse 2s infinite;
}

.sync-status.error {
    background: rgba(255, 59, 48, 0.2);
    color: #ff3b30;
    border-color: #ff3b30;
}

.sync-status.synced {
    background: rgba(48, 209, 88, 0.2);
    color: #30d158;
    border-color: #30d158;
}

.spinner {
    animation: spin 1s linear infinite;
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
    animation: slideDown 0.2s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
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
    transition: all 0.2s;
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

.sync-value.offline {
    color: var(--text-secondary);
}
.sync-value.syncing {
    color: var(--accent);
}
.sync-value.error {
    color: #ff3b30;
}
.sync-value.synced {
    color: #30d158;
}

.sync-error-message {
    font-size: 12px;
    color: #ff3b30;
    padding: 8px;
    background: rgba(255, 59, 48, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 59, 48, 0.3);
}

.manual-sync-btn {
    width: 100%;
    padding: 10px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    margin-top: 8px;
}

.manual-sync-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

/* Transiciones */
.slide-fade-enter-active {
    transition: all 0.2s ease;
}

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
        bottom: 20px;
        left: 20px;
        right: 20px;
        width: auto;
        max-width: none;
        margin: 0;
    }
}
</style>
