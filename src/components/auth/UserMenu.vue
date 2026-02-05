<script setup>
import { ref } from "vue";

defineProps({
    user: {
        type: Object,
        required: true,
    },
    userProfile: {
        type: Object,
        default: null,
    },
    isSigningOut: {
        type: Boolean,
        default: false,
    },
    pendingOps: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits(["sign-out"]);

const showMenu = ref(false);

const closeMenu = () => {
    showMenu.value = false;
};

const handleSignOut = () => {
    emit("sign-out");
    closeMenu();
};
</script>

<template>
    <div class="user-menu-container" @click.stop>
        <button
            class="user-button"
            @click="showMenu = !showMenu"
            :aria-label="'Menú de usuario'"
        >
            <div class="user-avatar">
                <span>{{
                    userProfile?.username?.[0]?.toUpperCase() ||
                    user.email[0].toUpperCase()
                }}</span>
            </div>
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                :class="{ rotated: showMenu }"
            >
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </button>

        <transition name="menu">
            <div v-if="showMenu" class="user-menu" @click.stop>
                <div class="menu-header">
                    <div class="user-info">
                        <div class="username">
                            @{{ userProfile?.username || "usuario" }}
                        </div>
                        <div class="email">{{ user.email }}</div>
                    </div>
                </div>

                <div class="menu-divider"></div>

                <div class="menu-items">
                    <button
                        class="menu-item danger"
                        :disabled="isSigningOut"
                        @click="handleSignOut"
                    >
                        <svg
                            v-if="!isSigningOut"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span v-if="!isSigningOut">Cerrar sesión</span>
                        <span v-else-if="pendingOps > 0"
                            >Guardando ({{ pendingOps }})...</span
                        >
                        <span v-else>Cerrando...</span>
                    </button>
                </div>
            </div>
        </transition>

        <div v-if="showMenu" class="menu-backdrop" @click="closeMenu"></div>
    </div>
</template>

<style scoped>
.user-menu-container {
    position: relative;
}

.user-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.user-button:hover {
    background: var(--hover-bg);
    border-color: var(--text-secondary);
}

.user-button svg {
    transition: transform 0.2s ease;
}

.user-button svg.rotated {
    transform: rotate(180deg);
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

.menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 998;
}

.user-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 240px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    z-index: 999;
    overflow: hidden;
}

.menu-header {
    padding: 16px;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.username {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.email {
    font-size: 13px;
    color: var(--text-secondary);
    word-break: break-all;
}

.menu-divider {
    height: 1px;
    background: var(--border-color);
}

.menu-items {
    padding: 8px;
}

.menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-align: left;
}

.menu-item:hover:not(:disabled) {
    background: var(--hover-bg);
}

.menu-item.danger {
    color: #dc3545;
}

.menu-item.danger:hover:not(:disabled) {
    background: rgba(220, 53, 69, 0.1);
}

.menu-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.menu-item svg {
    flex-shrink: 0;
}

/* Animaciones */
.menu-enter-active,
.menu-leave-active {
    transition: all 0.2s ease;
}

.menu-enter-from,
.menu-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 480px) {
    .user-menu {
        right: -8px;
        min-width: 220px;
    }
}
</style>
