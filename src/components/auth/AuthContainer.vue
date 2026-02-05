<script setup>
import { ref } from "vue";
import LoginForm from "./LoginForm.vue";
import SignupForm from "./SignupForm.vue";

defineProps({
    loading: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: null,
    },
});

const emit = defineEmits(["login", "signup", "close", "clear-error"]);

const authMode = ref("login"); // 'login' o 'signup'

const switchToSignup = () => {
    authMode.value = "signup";
    emit("clear-error");
};

const switchToLogin = () => {
    authMode.value = "login";
    emit("clear-error");
};

const handleLogin = (credentials) => {
    emit("login", credentials);
};

const handleSignup = (userData) => {
    emit("signup", userData);
};
</script>

<template>
    <div class="auth-overlay" @click.self="$emit('close')">
        <div class="auth-container">
            <button
                class="close-btn"
                @click="$emit('close')"
                aria-label="Cerrar"
            >
                <svg
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

            <div v-if="error" class="error-banner">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{{ error }}</span>
                <button @click="$emit('clear-error')" aria-label="Cerrar error">
                    <svg
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

            <div class="auth-content">
                <transition name="fade" mode="out-in">
                    <LoginForm
                        v-if="authMode === 'login'"
                        key="login"
                        @submit="handleLogin"
                        @switch-to-signup="switchToSignup"
                    />
                    <SignupForm
                        v-else
                        key="signup"
                        @submit="handleSignup"
                        @switch-to-login="switchToLogin"
                    />
                </transition>
            </div>

            <div v-if="loading" class="loading-overlay">
                <div class="spinner"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    overflow-y: auto;
}

.auth-container {
    position: relative;
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 40px;
}

.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
    z-index: 10;
}

.close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.error-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(220, 53, 69, 0.1);
    border: 1px solid rgba(220, 53, 69, 0.3);
    border-radius: 8px;
    color: #dc3545;
    font-size: 14px;
    margin-bottom: 24px;
}

.error-banner svg:first-child {
    flex-shrink: 0;
}

.error-banner span {
    flex: 1;
    line-height: 1.4;
}

.error-banner button {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: opacity 0.2s ease;
}

.error-banner button:hover {
    opacity: 0.7;
}

.auth-content {
    position: relative;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    z-index: 100;
}

.dark-theme .loading-overlay {
    background: rgba(0, 0, 0, 0.9);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.fade-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}

@media (max-width: 480px) {
    .auth-container {
        padding: 32px 24px;
        border-radius: 12px;
    }

    .close-btn {
        top: 12px;
        right: 12px;
    }
}

/* Scrollbar para el contenedor */
.auth-container::-webkit-scrollbar {
    width: 8px;
}

.auth-container::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 10px;
}

.auth-container::-webkit-scrollbar-track {
    background: transparent;
}
</style>
