<script setup>
import { ref } from "vue";
import UserMenu from "./auth/UserMenu.vue";

defineProps({
    isDark: Boolean,
    isMobile: Boolean,
    user: Object,
    userProfile: Object,
    isAuthenticated: Boolean,
    isSupabaseEnabled: Boolean,
    isSigningOut: {
        type: Boolean,
        default: false,
    },
    pendingOps: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits(["toggle-theme", "open-auth", "sign-out"]);

const showSidebar = ref(false);

const handleSignOut = () => {
    emit("sign-out");
    // Cerrar el sidebar automáticamente
    showSidebar.value = false;
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

        <!-- Desktop: Mostrar switch de tema y autenticación -->
        <div class="header-right" v-if="!isMobile">
            <button
                class="theme-btn"
                @click="$emit('toggle-theme')"
                :aria-label="isDark ? 'Modo claro' : 'Modo oscuro'"
            >
                <span class="vt-switch-check">
                    <span class="vt-switch-icon">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            focusable="false"
                            viewBox="0 0 24 24"
                            class="vt-switch-appearance-sun"
                        >
                            <path
                                d="M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S15.3,18,12,18zM12,8c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4C16,9.8,14.2,8,12,8z"
                            ></path>
                            <path
                                d="M12,4c-0.6,0-1-0.4-1-1V1c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,3.6,12.6,4,12,4z"
                            ></path>
                            <path
                                d="M12,24c-0.6,0-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,23.6,12.6,24,12,24z"
                            ></path>
                            <path
                                d="M5.6,6.6c-0.3,0-0.5-0.1-0.7-0.3L3.5,4.9c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C6.2,6.5,5.9,6.6,5.6,6.6z"
                            ></path>
                            <path
                                d="M19.8,20.8c-0.3,0-0.5-0.1-0.7-0.3l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C20.3,20.7,20,20.8,19.8,20.8z"
                            ></path>
                            <path
                                d="M3,13H1c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S3.6,13,3,13z"
                            ></path>
                            <path
                                d="M23,13h-2c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S23.6,13,23,13z"
                            ></path>
                            <path
                                d="M4.2,20.8c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C4.7,20.7,4.5,20.8,4.2,20.8z"
                            ></path>
                            <path
                                d="M18.4,6.6c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C18.9,6.5,18.6,6.6,18.4,6.6z"
                            ></path>
                        </svg>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            focusable="false"
                            viewBox="0 0 24 24"
                            class="vt-switch-appearance-moon"
                        >
                            <path
                                d="M12.1,22c-0.3,0-0.6,0-0.9,0c-5.5-0.5-9.5-5.4-9-10.9c0.4-4.8,4.2-8.6,9-9c0.4,0,0.8,0.2,1,0.5c0.2,0.3,0.2,0.8-0.1,1.1c-2,2.7-1.4,6.4,1.3,8.4c2.1,1.6,5,1.6,7.1,0c0.3-0.2,0.7-0.3,1.1-0.1c0.3,0.2,0.5,0.6,0.5,1c-0.2,2.7-1.5,5.1-3.6,6.8C16.6,21.2,14.4,22,12.1,22zM9.3,4.4c-2.9,1-5,3.6-5.2,6.8c-0.4,4.4,2.8,8.3,7.2,8.7c2.1,0.2,4.2-0.4,5.8-1.8c1.1-0.9,1.9-2.1,2.4-3.4c-2.5,0.9-5.3,0.5-7.5-1.1C9.2,11.4,8.1,7.7,9.3,4.4z"
                            ></path>
                        </svg>
                    </span>
                </span>
            </button>

            <!-- Autenticación en Desktop -->
            <template v-if="isSupabaseEnabled">
                <UserMenu
                    v-if="isAuthenticated"
                    :user="user"
                    :user-profile="userProfile"
                    :is-signing-out="isSigningOut"
                    :pending-ops="pendingOps"
                    @sign-out="$emit('sign-out')"
                />
                <button v-else class="login-btn" @click="$emit('open-auth')">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span>Iniciar Sesión</span>
                </button>
            </template>
        </div>

        <!-- Mobile: Mostrar botón hamburguesa -->
        <div class="header-right" v-else>
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
                                width="24"
                                height="24"
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
                        <!-- Tema -->
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
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden="true"
                                            focusable="false"
                                            viewBox="0 0 24 24"
                                            class="vt-switch-appearance-sun"
                                        >
                                            <path
                                                d="M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S15.3,18,12,18zM12,8c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4C16,9.8,14.2,8,12,8z"
                                            ></path>
                                            <path
                                                d="M12,4c-0.6,0-1-0.4-1-1V1c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,3.6,12.6,4,12,4z"
                                            ></path>
                                            <path
                                                d="M12,24c-0.6,0-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,23.6,12.6,24,12,24z"
                                            ></path>
                                            <path
                                                d="M5.6,6.6c-0.3,0-0.5-0.1-0.7-0.3L3.5,4.9c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C6.2,6.5,5.9,6.6,5.6,6.6z"
                                            ></path>
                                            <path
                                                d="M19.8,20.8c-0.3,0-0.5-0.1-0.7-0.3l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C20.3,20.7,20,20.8,19.8,20.8z"
                                            ></path>
                                            <path
                                                d="M3,13H1c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S3.6,13,3,13z"
                                            ></path>
                                            <path
                                                d="M23,13h-2c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S23.6,13,23,13z"
                                            ></path>
                                            <path
                                                d="M4.2,20.8c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C4.7,20.7,4.5,20.8,4.2,20.8z"
                                            ></path>
                                            <path
                                                d="M18.4,6.6c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C18.9,6.5,18.6,6.6,18.4,6.6z"
                                            ></path>
                                        </svg>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden="true"
                                            focusable="false"
                                            viewBox="0 0 24 24"
                                            class="vt-switch-appearance-moon"
                                        >
                                            <path
                                                d="M12.1,22c-0.3,0-0.6,0-0.9,0c-5.5-0.5-9.5-5.4-9-10.9c0.4-4.8,4.2-8.6,9-9c0.4,0,0.8,0.2,1,0.5c0.2,0.3,0.2,0.8-0.1,1.1c-2,2.7-1.4,6.4,1.3,8.4c2.1,1.6,5,1.6,7.1,0c0.3-0.2,0.7-0.3,1.1-0.1c0.3,0.2,0.5,0.6,0.5,1c-0.2,2.7-1.5,5.1-3.6,6.8C16.6,21.2,14.4,22,12.1,22zM9.3,4.4c-2.9,1-5,3.6-5.2,6.8c-0.4,4.4,2.8,8.3,7.2,8.7c2.1,0.2,4.2-0.4,5.8-1.8c1.1-0.9,1.9-2.1,2.4-3.4c-2.5,0.9-5.3,0.5-7.5-1.1C9.2,11.4,8.1,7.7,9.3,4.4z"
                                            ></path>
                                        </svg>
                                    </span>
                                </span>
                            </button>
                        </div>

                        <!-- Autenticación en Mobile Sidebar -->
                        <template v-if="isSupabaseEnabled">
                            <div
                                v-if="isAuthenticated"
                                class="sidebar-item sidebar-user"
                            >
                                <div class="sidebar-user-info">
                                    <div class="sidebar-user-avatar">
                                        <span>{{
                                            userProfile?.username?.[0]?.toUpperCase() ||
                                            user.email[0].toUpperCase()
                                        }}</span>
                                    </div>
                                    <div class="sidebar-user-details">
                                        <div class="sidebar-username">
                                            @{{
                                                userProfile?.username ||
                                                "usuario"
                                            }}
                                        </div>
                                        <div class="sidebar-email">
                                            {{ user.email }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="isAuthenticated"
                                class="sidebar-item sidebar-action"
                            >
                                <button
                                    class="sidebar-logout-btn"
                                    :disabled="isSigningOut"
                                    @click="handleSignOut"
                                >
                                    <svg
                                        v-if="!isSigningOut"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                                        />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    <span v-if="!isSigningOut">
                                        Cerrar sesión
                                    </span>
                                    <span v-else-if="pendingOps > 0">
                                        Guardando ({{ pendingOps }})...
                                    </span>
                                    <span v-else>Cerrando...</span>
                                </button>
                            </div>

                            <div v-else class="sidebar-item sidebar-action">
                                <button
                                    class="sidebar-login-btn"
                                    @click="
                                        emit('open-auth');
                                        showSidebar = false;
                                    "
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                                        />
                                        <polyline points="10 17 15 12 10 7" />
                                        <line x1="15" y1="12" x2="3" y2="12" />
                                    </svg>
                                    <span>Iniciar Sesión</span>
                                </button>
                            </div>
                        </template>
                    </div>
                </aside>
            </div>
        </Transition>
    </header>
</template>

<style scoped>
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
    z-index: 100;
    box-shadow: var(--shadow-sm);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.app-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.title-icon {
    font-size: 24px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Botón de tema */
.theme-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    transition: all 0.2s;
    border-radius: 8px;
}

.theme-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.vt-switch-check {
    position: relative;
    width: 40px;
    height: 22px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 11px;
    display: inline-flex;
    align-items: center;
    transition: border-color 0.25s;
}

.vt-switch-check:hover {
    border-color: var(--text-secondary);
}

.dark-theme .vt-switch-check {
    border-color: var(--accent);
    background-color: var(--accent);
}

.vt-switch-icon {
    position: relative;
    width: 18px;
    height: 18px;
    display: block;
    transition: transform 0.25s;
    margin-left: 2px;
}

.dark-theme .vt-switch-icon {
    transform: translateX(18px);
}

.vt-switch-appearance-sun {
    position: absolute;
    top: 0;
    left: 0;
    width: 18px;
    height: 18px;
    fill: var(--text-secondary);
}

.vt-switch-appearance-moon {
    position: absolute;
    top: 0;
    left: 0;
    width: 18px;
    height: 18px;
    fill: #ffffff;
}

.dark-theme .vt-switch-appearance-sun {
    opacity: 0;
}

.vt-switch-appearance-moon {
    opacity: 0;
}

.dark-theme .vt-switch-appearance-moon {
    opacity: 1;
}

/* Botón de login */
.login-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.login-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

/* Hamburger button para mobile */
.hamburger-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    transition: all 0.2s;
    border-radius: 8px;
}

.hamburger-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

/* Sidebar */
.sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
    display: flex;
    justify-content: flex-end;
}

.sidebar {
    width: 100%;
    max-width: 320px;
    background: var(--card-bg);
    height: 100%;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-sidebar-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s;
}

.close-sidebar-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.sidebar-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
}

.sidebar-label {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
}

/* Switch en sidebar */
.vt-switch {
    position: relative;
    border-radius: 11px;
    width: 40px;
    height: 22px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: border-color 0.25s;
    flex-shrink: 0;
}

.vt-switch:hover {
    border-color: var(--text-secondary);
}

.dark-theme .vt-switch {
    border-color: var(--accent);
    background-color: var(--accent);
}

/* Sidebar User Info */
.sidebar-user {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
}

.sidebar-user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.sidebar-user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
    flex-shrink: 0;
}

.sidebar-user-details {
    flex: 1;
    min-width: 0;
}

.sidebar-username {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.sidebar-email {
    font-size: 13px;
    color: var(--text-secondary);
    word-break: break-all;
}

/* Sidebar Action Buttons */
.sidebar-action {
    padding: 0;
    background: transparent;
    border: none;
}

.sidebar-login-btn,
.sidebar-logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.sidebar-login-btn:hover,
.sidebar-logout-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.sidebar-logout-btn {
    background: #dc3545;
}

.sidebar-logout-btn:hover:not(:disabled) {
    background: #c82333;
}

.sidebar-logout-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

/* Transiciones */
.sidebar-enter-active,
.sidebar-leave-active {
    transition: all 0.3s ease;
}

.sidebar-enter-active .sidebar,
.sidebar-leave-active .sidebar {
    transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
    opacity: 0;
}

.sidebar-enter-from .sidebar {
    transform: translateX(100%);
}

.sidebar-leave-to .sidebar {
    transform: translateX(100%);
}

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

@media (max-width: 480px) {
    .app-title span:not(.title-icon) {
        display: none;
    }

    .app-title::after {
        content: "DPS";
        font-size: 16px;
    }
}
</style>
