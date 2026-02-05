<script setup>
import { ref } from "vue";

const props = defineProps({
    isDark: Boolean,
    isMobile: Boolean,
});

const emit = defineEmits(["toggle-theme"]);

const showSidebar = ref(false);
</script>

<template>
    <header class="app-header">
        <div class="header-left">
            <h1 class="app-title">
                <span class="title-icon">🎨</span>
                Dynamic Prompt Studio
            </h1>
        </div>

        <!-- Desktop: Mostrar switch de tema -->
        <div class="header-right" v-if="!isMobile">
            <button
                class="vt-switch vt-switch-appearance"
                type="button"
                role="switch"
                :aria-label="
                    isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
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
                                @click="
                                    emit('toggle-theme')
                                    // showSidebar = false;
                                "
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
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 900;
    box-shadow: var(--shadow-sm);
}

.header-left {
    display: flex;
    align-items: center;
}

.app-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
}

.title-icon {
    font-size: 24px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* VT Switch Styles */
.vt-switch {
    position: relative;
    border-radius: 11px;
    display: block;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    background-color: var(--bg-secondary);
    transition:
        border-color 0.25s,
        background-color 0.25s;
    cursor: pointer;
}

.vt-switch:hover {
    border-color: var(--accent);
}

.dark-theme .vt-switch {
    border-color: var(--accent);
    background-color: var(--accent);
}

.vt-switch-check {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: transform 0.25s;
}

.dark-theme .vt-switch-check {
    transform: translateX(18px);
    background-color: #000;
}

.vt-switch-icon {
    position: relative;
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    overflow: hidden;
}

.vt-switch-icon > svg {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    fill: var(--text-primary);
}

.vt-switch-appearance-sun {
    opacity: 1;
    transition: opacity 0.25s;
}

.vt-switch-appearance-moon {
    opacity: 0;
    transition: opacity 0.25s;
}

.dark-theme .vt-switch-appearance-sun {
    opacity: 0;
}

.dark-theme .vt-switch-appearance-moon {
    opacity: 1;
}

.dark-theme .vt-switch-icon > svg {
    fill: #fff;
}

.hamburger-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border-radius: 8px;
}

.hamburger-btn:hover {
    background: var(--hover-bg);
}

/* Sidebar */
.sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 999;
    display: flex;
    justify-content: flex-end;
}

.sidebar {
    width: 100%;
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
