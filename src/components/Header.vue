<script setup>
import { ref, computed } from "vue";
import SyncStatus from "./SyncStatus.vue";
import { useSyncManager } from "../composables/useSyncManager";

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

const props = defineProps({
    isDark: Boolean,
    isMobile: Boolean,
    user: Object,
});

const emit = defineEmits([
    "toggle-theme",
    "open-auth",
    "sign-out",
    "manual-sync",
]);

const showSidebar = ref(false);

// Manejo de usuario
const handleUserAction = () => {
    if (props.user) {
        // Mostrar menú de usuario
        emit("sign-out");
    } else {
        // Mostrar login
        emit("open-auth", "login");
    }
};

// Manejar sincronización manual desde mobile
const handleMobileSync = async () => {
    await manualSync();
    // Cerrar sidebar después de 2 segundos si fue exitoso
    if (syncSuccess.value) {
        setTimeout(() => {
            showSidebar.value = false;
        }, 2000);
    }
};

// Estado del botón de sync
const syncButtonText = computed(() => {
    if (isSyncingNow.value) return "Sincronizando...";
    if (syncSuccess.value) return "¡Sincronizado!";
    if (isThrottled.value) return `Espera ${throttleSecondsRemaining.value}s`;
    if (isOffline.value) return "Sin conexión";
    return "Sincronizar ahora";
});

// Formatear última sincronización
const formatLastSync = () => {
    if (!lastSyncTime.value) return "Nunca";

    const date = new Date(lastSyncTime.value);
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
</script>

<template>
    <header class="app-header">
        <div class="header-left">
            <h1 class="app-title">
                <span class="title-icon">🎨</span>
                Dynamic Prompt Studio
            </h1>
        </div>

        <div class="header-right">
            <!-- Desktop: Mostrar estado de sync y usuario -->
            <div v-if="!isMobile" class="header-actions">
                <!-- Sync Status Component -->
                <SyncStatus />

                <!-- User Menu -->
                <div class="user-menu-container">
                    <button
                        class="user-btn"
                        @click="handleUserAction"
                        :title="
                            user
                                ? `Cerrar sesión (${user.email})`
                                : 'Iniciar sesión'
                        "
                    >
                        <svg
                            v-if="!user"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                            />
                            <circle cx="12" cy="7" r="4" />
                        </svg>

                        <div v-else class="user-avatar">
                            {{ user.email.charAt(0).toUpperCase() }}
                        </div>

                        <span v-if="user" class="user-email">
                            {{ user.email.split("@")[0] }}
                        </span>
                    </button>
                </div>

                <!-- Theme Toggle -->
                <button
                    class="vt-switch vt-switch-appearance"
                    type="button"
                    role="switch"
                    :aria-label="
                        isDark
                            ? 'Cambiar a modo claro'
                            : 'Cambiar a modo oscuro'
                    "
                    :aria-checked="isDark"
                    @click="emit('toggle-theme')"
                >
                    <span class="vt-switch-check">
                        <span class="vt-switch-icon">
                            <svg
                                v-if="isDark"
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                />
                            </svg>
                            <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line
                                    x1="18.36"
                                    y1="18.36"
                                    x2="19.78"
                                    y2="19.78"
                                />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line
                                    x1="4.22"
                                    y1="19.78"
                                    x2="5.64"
                                    y2="18.36"
                                />
                                <line
                                    x1="18.36"
                                    y1="5.64"
                                    x2="19.78"
                                    y2="4.22"
                                />
                            </svg>
                        </span>
                    </span>
                </button>
            </div>

            <!-- Mobile: Mostrar botón hamburguesa -->
            <div v-else>
                <button
                    class="hamburger-btn"
                    @click="showSidebar = true"
                    title="Abrir menú"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Sidebar para mobile (actualizado con auth) -->
        <Transition name="sidebar">
            <div
                v-if="showSidebar"
                class="sidebar-overlay"
                @click="showSidebar = false"
            >
                <aside class="sidebar" @click.stop>
                    <div class="sidebar-header">
                        <h2>Configuración</h2>
                        <button
                            class="close-sidebar-btn"
                            @click="showSidebar = false"
                            title="Cerrar"
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

                    <div class="sidebar-content">
                        <!-- Sección Usuario -->
                        <div class="sidebar-section">
                            <h3>Cuenta</h3>
                            <div v-if="user" class="user-info-mobile">
                                <div class="user-avatar-mobile">
                                    {{ user.email.charAt(0).toUpperCase() }}
                                </div>
                                <div class="user-details">
                                    <strong>{{ user.email }}</strong>
                                    <small>Conectado</small>
                                </div>
                                <button
                                    @click="
                                        emit('sign-out');
                                        showSidebar = false;
                                    "
                                    class="sign-out-btn-mobile"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                            <div v-else class="auth-buttons-mobile">
                                <button
                                    @click="
                                        emit('open-auth', 'login');
                                        showSidebar = false;
                                    "
                                    class="login-btn-mobile"
                                >
                                    Iniciar sesión
                                </button>
                                <button
                                    @click="
                                        emit('open-auth', 'register');
                                        showSidebar = false;
                                    "
                                    class="register-btn-mobile"
                                >
                                    Crear cuenta
                                </button>
                            </div>
                        </div>

                        <!-- Sección Tema -->
                        <div class="sidebar-item">
                            <span class="sidebar-label">Apariencia</span>
                            <button
                                class="vt-switch vt-switch-appearance"
                                type="button"
                                role="switch"
                                :aria-label="
                                    isDark
                                        ? 'Cambiar a modo claro'
                                        : 'Cambiar a modo oscuro'
                                "
                                :aria-checked="isDark"
                                @click="emit('toggle-theme')"
                            >
                                <span class="vt-switch-check">
                                    <span class="vt-switch-icon">
                                        <svg
                                            v-if="isDark"
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <path
                                                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                            />
                                        </svg>
                                        <svg
                                            v-else
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <circle cx="12" cy="12" r="5" />
                                        </svg>
                                    </span>
                                </span>
                            </button>
                        </div>

                        <!-- Sección Sincronización -->
                        <div v-if="user" class="sidebar-section">
                            <h3>Sincronización</h3>
                            <div class="sync-info-mobile">
                                <div class="sync-info-row">
                                    <span class="sync-label-mobile"
                                        >Última sync:</span
                                    >
                                    <span
                                        class="sync-time-mobile"
                                        :class="{
                                            success: syncSuccess,
                                            syncing: isSyncingNow,
                                        }"
                                        >{{ formatLastSync() }}</span
                                    >
                                </div>

                                <!-- Mensaje de estado -->
                                <div
                                    v-if="isThrottled && !isSyncingNow"
                                    class="throttle-warning-mobile"
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
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    Espera {{ throttleSecondsRemaining }}
                                    segundos
                                </div>

                                <div
                                    v-else-if="isOffline"
                                    class="connection-warning-mobile"
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
                                        <line
                                            x1="12"
                                            y1="17"
                                            x2="12.01"
                                            y2="17"
                                        />
                                    </svg>
                                    Sin conexión a internet
                                </div>

                                <div
                                    v-else-if="syncError && !isOffline"
                                    class="sync-error-mobile"
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
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line
                                            x1="12"
                                            y1="16"
                                            x2="12.01"
                                            y2="16"
                                        />
                                    </svg>
                                    {{ syncError }}
                                </div>

                                <div
                                    v-else-if="isSyncingNow"
                                    class="syncing-message-mobile"
                                >
                                    <svg
                                        class="spinner-mobile"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Sincronizando tus datos...
                                </div>

                                <p v-else>
                                    Sincroniza tus datos manualmente cuando lo
                                    necesites
                                </p>

                                <button
                                    @click="handleMobileSync"
                                    class="sync-now-btn"
                                    :class="{
                                        success: syncSuccess,
                                        disabled: isOffline || isThrottled,
                                        syncing: isSyncingNow,
                                    }"
                                    :disabled="
                                        isOffline || isSyncingNow || isThrottled
                                    "
                                >
                                    <!-- Icono de éxito -->
                                    <svg
                                        v-if="syncSuccess"
                                        class="checkmark-mobile"
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

                                    <!-- Icono de sincronizando -->
                                    <svg
                                        v-else-if="isSyncingNow"
                                        class="spinner-mobile"
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

                                    <!-- Icono de offline -->
                                    <svg
                                        v-else-if="isOffline"
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

                                    <!-- Icono de throttle -->
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

                                    <!-- Icono normal -->
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
                                        <path d="M23 4v6h-6" />
                                        <path
                                            d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
                                        />
                                    </svg>

                                    {{ syncButtonText }}
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </Transition>
    </header>
</template>

<style scoped>
/* === HEADER BASE === */
.app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 1000;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.9);
}

.dark-theme .app-header {
    background: rgba(0, 0, 0, 0.9);
}

.header-left {
    flex: 1;
}

.app-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
}

.title-icon {
    font-size: 24px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* === HEADER ACTIONS === */
.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-menu-container {
    position: relative;
}

.user-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
}

.user-btn:hover {
    background: var(--hover-bg);
}

.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
}

.user-email {
    font-size: 13px;
    font-weight: 500;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* === VT SWITCH (THEME TOGGLE) === */
.vt-switch {
    position: relative;
    border-radius: 11px;
    display: block;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    background-color: var(--bg-secondary);
    transition: background-color 0.25s;
}

.vt-switch:hover {
    background-color: var(--hover-bg);
}

.vt-switch-check {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--white);
    box-shadow: var(--shadow-sm);
    transition: transform 0.25s;
}

.vt-switch[aria-checked="true"] .vt-switch-check {
    transform: translateX(18px);
}

.vt-switch-appearance[aria-checked="true"] {
    background-color: var(--accent);
    border-color: var(--accent);
}

.vt-switch-icon {
    position: relative;
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
}

.vt-switch-icon svg {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    fill: var(--text-primary);
}

/* === HAMBURGER BUTTON === */
.hamburger-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.hamburger-btn:hover {
    background: var(--hover-bg);
}

/* === MOBILE SIDEBAR === */
.sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    justify-content: flex-end;
}

.sidebar {
    background: var(--bg-primary);
    width: 320px;
    max-width: 85vw;
    height: 100vh;
    padding: 24px;
    overflow-y: auto;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
}

.sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
}

.close-sidebar-btn {
    background: none;
    border: none;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.close-sidebar-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.sidebar-section h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.sidebar-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
}

.sidebar-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

/* === USER INFO MOBILE === */
.user-info-mobile {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 12px;
}

.user-avatar-mobile {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 8px;
}

.user-details strong {
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
    color: var(--text-primary);
    word-break: break-all;
}

.user-details small {
    font-size: 12px;
    color: var(--text-secondary);
}

.sign-out-btn-mobile {
    width: 100%;
    padding: 12px;
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
    border: 1px solid rgba(255, 59, 48, 0.3);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.sign-out-btn-mobile:hover {
    background: rgba(255, 59, 48, 0.2);
}

.auth-buttons-mobile {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.login-btn-mobile,
.register-btn-mobile {
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.login-btn-mobile {
    background: var(--accent);
    color: white;
    border: none;
}

.login-btn-mobile:hover {
    background: var(--accent-hover);
}

.register-btn-mobile {
    background: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
}

.register-btn-mobile:hover {
    background: rgba(0, 113, 227, 0.1);
}

.sync-info-mobile {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.sync-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
}

.sync-label-mobile {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
}

.sync-time-mobile {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    transition: all 0.3s ease;
}

.sync-time-mobile.success {
    color: #30d158;
    animation: fadeInScale 0.3s ease;
}

.sync-time-mobile.syncing {
    color: var(--accent);
    animation: pulse 2s infinite;
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

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* Mensajes de estado */
.connection-warning-mobile,
.sync-error-mobile,
.syncing-message-mobile,
.throttle-warning-mobile {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 12px;
    line-height: 1.4;
}

.throttle-warning-mobile {
    background: rgba(255, 149, 0, 0.1);
    border: 1px solid rgba(255, 149, 0, 0.3);
    color: #ff9500;
}

.connection-warning-mobile {
    background: rgba(255, 149, 0, 0.1);
    border: 1px solid rgba(255, 149, 0, 0.3);
    color: #ff9500;
}

.sync-error-mobile {
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: #ff3b30;
}

.syncing-message-mobile {
    background: rgba(10, 132, 255, 0.1);
    border: 1px solid rgba(10, 132, 255, 0.3);
    color: var(--accent);
    animation: pulse 2s infinite;
}

.sync-info-mobile p {
    margin-bottom: 12px;
}

.sync-now-btn {
    width: 100%;
    padding: 12px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
}

.sync-now-btn:hover:not(.disabled):not(.syncing) {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.sync-now-btn:active:not(.disabled):not(.syncing) {
    transform: translateY(0);
}

/* Estado de éxito */
.sync-now-btn.success {
    background: #30d158;
    animation: successBtnPulse 0.6s ease;
}

.sync-now-btn.success:hover {
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

/* Estado deshabilitado (offline) */
.sync-now-btn.disabled {
    background: rgba(142, 142, 147, 0.3);
    color: var(--text-secondary);
    cursor: not-allowed;
    opacity: 0.6;
}

/* Estado sincronizando */
.sync-now-btn.syncing {
    background: var(--accent);
    cursor: wait;
    opacity: 0.8;
}

/* Animaciones de iconos */
.spinner-mobile {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.checkmark-mobile {
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

/* === SIDEBAR TRANSITIONS === */
.sidebar-enter-active,
.sidebar-leave-active {
    transition: opacity 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
    opacity: 0;
}

.sidebar-enter-active .sidebar,
.sidebar-leave-active .sidebar {
    transition: transform 0.3s ease;
}

.sidebar-enter-from .sidebar,
.sidebar-leave-to .sidebar {
    transform: translateX(100%);
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
    .app-header {
        padding: 0 16px;
    }

    .app-title {
        font-size: 16px;
    }

    .title-icon {
        font-size: 20px;
    }
}
</style>
