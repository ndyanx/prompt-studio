<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import SyncStatus from "./SyncStatus.vue";
import { useSyncStore } from "../stores/useSyncStore";

const props = defineProps({
    isDark: Boolean,
    isMobile: Boolean,
    user: Object,
    activeMainView: {
        type: String,
        default: "studio",
    },
});

const emit = defineEmits([
    "toggle-theme",
    "open-auth",
    "sign-out",
    "toggle-gallery",
]);

const showSidebar = ref(false);

const syncStore = useSyncStore();
const {
    lastSyncTime,
    isSyncingNow,
    syncError,
    isOffline,
    pendingCount,
    hasPending,
} = storeToRefs(syncStore);

const formatSyncTime = computed(() => {
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
});

const handleUserAction = () => {
    if (props.user) {
        emit("sign-out");
    } else {
        emit("open-auth", "login");
    }
};
</script>

<template>
    <header class="app-header">
        <div class="header-left">
            <h1 class="app-title">
                <span class="title-icon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 100 100"
                        width="28"
                        height="28"
                        class="title-svg"
                    >
                        <circle cx="50" cy="50" r="50" class="svg-circle" />
                        <path
                            d="M20 50 A30 30 0 0 1 50 20"
                            stroke="#BB86FC"
                            stroke-width="6"
                            fill="none"
                        />
                        <path
                            d="M50 20 A30 30 0 0 1 80 50"
                            class="svg-arc-white"
                            stroke-width="6"
                            fill="none"
                        />
                        <path
                            d="M80 50 A30 30 0 0 1 50 80"
                            stroke="#BB86FC"
                            stroke-width="6"
                            fill="none"
                        />
                        <path
                            d="M50 80 A30 30 0 0 1 20 50"
                            class="svg-arc-white"
                            stroke-width="6"
                            fill="none"
                        />
                    </svg>
                </span>
                DixieLab
            </h1>
        </div>

        <div class="header-right">
            <!-- Desktop: Mostrar estado de sync y usuario -->
            <div v-if="!isMobile" class="header-actions">
                <!-- Gallery Toggle -->
                <button
                    class="gallery-toggle-btn"
                    :class="{ active: activeMainView === 'gallery' }"
                    @click="emit('toggle-gallery')"
                    :title="
                        activeMainView === 'gallery'
                            ? 'Volver al Studio'
                            : 'Ver Galería'
                    "
                >
                    <svg
                        v-if="activeMainView !== 'gallery'"
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                        />
                    </svg>
                    <span class="gallery-btn-label">
                        {{
                            activeMainView === "gallery" ? "Studio" : "Galería"
                        }}
                    </span>
                </button>

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

        <!-- Sidebar para mobile -->
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
                        <!-- Galería toggle mobile -->
                        <div class="sidebar-item">
                            <span class="sidebar-label">Vista</span>
                            <button
                                class="gallery-toggle-btn"
                                :class="{
                                    active: activeMainView === 'gallery',
                                }"
                                @click="
                                    emit('toggle-gallery');
                                    showSidebar = false;
                                "
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
                                    <rect
                                        x="3"
                                        y="3"
                                        width="7"
                                        height="7"
                                        rx="1"
                                    />
                                    <rect
                                        x="14"
                                        y="3"
                                        width="7"
                                        height="7"
                                        rx="1"
                                    />
                                    <rect
                                        x="3"
                                        y="14"
                                        width="7"
                                        height="7"
                                        rx="1"
                                    />
                                    <rect
                                        x="14"
                                        y="14"
                                        width="7"
                                        height="7"
                                        rx="1"
                                    />
                                </svg>
                                {{
                                    activeMainView === "gallery"
                                        ? "Volver al Studio"
                                        : "Ver Galería"
                                }}
                            </button>
                        </div>

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
                        <!-- Sección Sincronización mobile -->
                        <div v-if="user" class="sidebar-section">
                            <h3>Sincronización</h3>
                            <div class="sync-info-mobile">
                                <p class="last-sync-text">
                                    <strong>Última sync:</strong>
                                    {{ formatSyncTime }}
                                </p>
                                <div
                                    v-if="isOffline"
                                    class="connection-warning-mobile"
                                >
                                    Sin conexión — los cambios se guardan
                                    localmente
                                </div>
                                <div
                                    v-if="hasPending && !isOffline"
                                    class="throttle-warning-mobile"
                                >
                                    {{ pendingCount }} cambio{{
                                        pendingCount > 1 ? "s" : ""
                                    }}
                                    pendiente{{ pendingCount > 1 ? "s" : "" }}
                                </div>
                                <div
                                    v-if="syncError"
                                    class="sync-error-message-mobile"
                                >
                                    {{ syncError }}
                                </div>
                                <div
                                    v-if="isSyncingNow"
                                    class="syncing-message-mobile"
                                >
                                    Sincronizando...
                                </div>
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
    /* backdrop-filter eliminado — header permanente: el blur se recalcula
       en cada paint de cualquier elemento debajo, incluyendo el textarea */
    background: rgba(255, 255, 255, 0.95);
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
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
}

/* El círculo de fondo siempre negro — es parte del diseño del logo */
.svg-circle {
    fill: #000000;
}

/* Los arcos blancos se vuelven negros en dark mode para seguir siendo visibles
   sobre el círculo que también es negro. Se convierten a un gris claro. */
.svg-arc-white {
    stroke: #ffffff;
}

.dark-theme .svg-arc-white {
    stroke: #cccccc;
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
    transition:
        background 0.2s,
        color 0.2s,
        border-color 0.2s;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    /*
       min-width fijo evita que el botón cambie de tamaño al hidratar
       el estado de auth (sin user: solo icono SVG, con user: avatar + email).
       Sin esto, el ancho variable genera layout shift en header-right.
    */
    min-width: 44px;
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
    transition:
        background 0.2s,
        color 0.2s;
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
    transition:
        background 0.2s,
        color 0.2s;
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
    padding: 3px 0;
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
    transition:
        background 0.2s,
        color 0.2s,
        border-color 0.2s;
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
    transition:
        background 0.2s,
        color 0.2s;
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

/* === SYNC INFO MOBILE === */
.sync-info-mobile {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.last-sync-text {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
}

.last-sync-text strong {
    color: var(--text-secondary);
    font-weight: 600;
}

.sync-info-mobile p {
    margin-bottom: 12px;
}

.throttle-warning-mobile {
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
    margin-bottom: 12px;
}

.connection-warning-mobile {
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
    margin-bottom: 12px;
}

.sync-error-message-mobile {
    font-size: 12px;
    color: #ff3b30;
    padding: 10px;
    background: rgba(255, 59, 48, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(255, 59, 48, 0.3);
    margin-bottom: 12px;
}

.syncing-message-mobile {
    font-size: 12px;
    color: var(--accent);
    padding: 10px;
    background: rgba(10, 132, 255, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(10, 132, 255, 0.3);
    text-align: center;
    animation: pulse 2s infinite;
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

    .title-icon svg {
        width: 24px;
        height: 24px;
    }
}

/* ─── Gallery Toggle Button ─────────────────────────────────────────────── */
.gallery-toggle-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
}

.gallery-toggle-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--accent);
}

.gallery-toggle-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
}

.gallery-toggle-btn.active:hover {
    background: var(--accent-hover);
}

.gallery-btn-label {
    font-size: 13px;
}
</style>
