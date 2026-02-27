<script setup>
import { computed, ref } from "vue";
import { useSyncManager } from "../composables/useSyncManager";
import { useAuth } from "../composables/useAuth";

const {
    lastSyncTime,
    isSyncingNow,
    syncError,
    syncSuccess,
    isOffline,
    isThrottled,
    throttleSecondsRemaining,
    manualSync,
} = useSyncManager();
const { user, isAuthenticated } = useAuth();

const showSyncDetails = ref(false);

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
    if (syncSuccess.value) return "success";
    if (isThrottled.value) return "throttled";
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
        case "success":
            return "¡Sincronizado!";
        case "throttled":
            return `Espera ${throttleSecondsRemaining.value}s`;
        default:
            return "Listo";
    }
});

const handleManualSync = async () => {
    await manualSync();
};
</script>

<template>
    <div class="sync-status-container">
        <div
            class="sync-status"
            :class="syncStatus"
            @click="showSyncDetails = !showSyncDetails"
            :title="
                isAuthenticated
                    ? isOffline
                        ? 'Sin conexión a internet'
                        : 'Estado de sincronización'
                    : 'No autenticado'
            "
        >
            <!-- Offline (no autenticado) -->
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

            <!-- Sin conexión (WiFi con X) -->
            <svg
                v-else-if="isOffline"
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

            <!-- Syncing -->
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

            <!-- Error -->
            <svg
                v-else-if="syncError"
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

            <!-- Success (animación especial) -->
            <svg
                v-else-if="syncSuccess"
                class="checkmark"
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

            <!-- Synced normal -->
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
                    <h3>Sincronización Manual</h3>
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
                            {{ syncStatusText }}
                        </span>
                    </div>

                    <!-- Mensaje de throttle -->
                    <div
                        v-if="isThrottled && !isSyncingNow"
                        class="throttle-warning"
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
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Espera {{ throttleSecondsRemaining }} segundos para
                        sincronizar nuevamente
                    </div>

                    <!-- Mensaje de conexión -->
                    <div v-if="isOffline" class="connection-warning">
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
                                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                            />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Sin conexión a internet. Conecta para sincronizar.
                    </div>

                    <!-- Mensaje de error -->
                    <div
                        v-if="syncError && !isOffline"
                        class="sync-error-message"
                    >
                        {{ syncError }}
                    </div>

                    <!-- Botón de sincronizar -->
                    <button
                        v-if="isAuthenticated && !isSyncingNow"
                        @click="handleManualSync"
                        class="manual-sync-btn"
                        :class="{
                            success: syncSuccess,
                            disabled: isOffline || isThrottled,
                        }"
                        :disabled="isOffline || isThrottled"
                    >
                        <svg
                            v-if="!syncSuccess && !isOffline && !isThrottled"
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
                        <svg
                            v-else-if="!isOffline && !isThrottled"
                            class="checkmark-btn"
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
                        <svg
                            v-else-if="isThrottled"
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
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path
                                d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39"
                            />
                        </svg>
                        {{
                            syncSuccess
                                ? "¡Sincronizado!"
                                : isOffline
                                  ? "Sin conexión"
                                  : isThrottled
                                    ? `Espera ${throttleSecondsRemaining}s`
                                    : "Sincronizar ahora"
                        }}
                    </button>

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
    transition:
        background 0.3s ease,
        transform 0.3s ease,
        border-color 0.3s ease;
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

/* Nuevo: estado sin conexión */
.sync-status.no-connection {
    background: rgba(255, 149, 0, 0.2);
    color: #ff9500;
    border-color: #ff9500;
    animation: pulse 2s infinite;
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
    animation: shake 0.5s;
}

.sync-status.synced {
    background: rgba(48, 209, 88, 0.2);
    color: #30d158;
    border-color: #30d158;
}

/* Estado de éxito con animación */
.sync-status.success {
    background: rgba(48, 209, 88, 0.3);
    color: #30d158;
    border-color: #30d158;
    animation: successPulse 0.6s ease;
}

@keyframes successPulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(48, 209, 88, 0.5);
    }
    100% {
        transform: scale(1);
    }
}

/* Animación de shake para errores */
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

.shake {
    animation: shake 0.5s;
}

.wifi-off {
    animation: pulse 2s infinite;
}

.checkmark {
    animation: checkmarkDraw 0.5s ease;
}

@keyframes checkmarkDraw {
    0% {
        stroke-dasharray: 0, 100;
        stroke-dashoffset: 0;
    }
    100% {
        stroke-dasharray: 100, 100;
        stroke-dashoffset: 0;
    }
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

.sync-value.offline {
    color: var(--text-secondary);
}
.sync-value.no-connection {
    color: #ff9500;
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
.sync-value.success {
    color: #30d158;
    animation: fadeInScale 0.3s ease;
}
.sync-value.throttled {
    color: #ff9500;
}

@keyframes fadeInScale {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.connection-warning {
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

.throttle-warning {
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
    transition:
        background 0.2s,
        opacity 0.2s;
    margin-top: 8px;
}

.manual-sync-btn:hover:not(.disabled) {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.manual-sync-btn:active:not(.disabled) {
    transform: translateY(0);
}

/* Botón deshabilitado (offline) */
.manual-sync-btn.disabled {
    background: rgba(142, 142, 147, 0.3);
    color: var(--text-secondary);
    cursor: not-allowed;
    opacity: 0.6;
}

/* Botón en estado de éxito */
.manual-sync-btn.success {
    background: #30d158;
    animation: successBtnPulse 0.6s ease;
}

.manual-sync-btn.success:hover {
    background: #28a745;
    box-shadow: 0 4px 12px rgba(48, 209, 88, 0.4);
}

@keyframes successBtnPulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}

.checkmark-btn {
    animation: checkmarkDraw 0.5s ease;
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
        bottom: 80px; /* Ajustado para mobile tab bar */
        left: 20px;
        right: 20px;
        width: auto;
        max-width: none;
        margin: 0;
    }

    /* Hacer el botón más grande en mobile */
    .manual-sync-btn {
        padding: 14px;
        font-size: 14px;
        min-height: 48px;
    }

    .sync-status {
        width: 44px;
        height: 44px;
    }
}
</style>
