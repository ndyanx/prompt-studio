<script setup>
import { ref, computed } from "vue";
import { useAuth } from "../composables/useAuth";

const props = defineProps({
    isOpen: Boolean,
    mode: String, // 'login' | 'register'
});

const emit = defineEmits(["close", "success"]);

const { signIn, signUp, authError, isLoading } = useAuth();

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const localMode = ref(props.mode || "login");

const isRegisterMode = computed(() => localMode.value === "register");
const isFormValid = computed(() => {
    if (isRegisterMode.value) {
        return (
            email.value &&
            password.value &&
            confirmPassword.value &&
            password.value === confirmPassword.value &&
            password.value.length >= 6
        );
    }
    return email.value && password.value;
});

const passwordsMatch = computed(() => {
    if (!password.value || !confirmPassword.value) return true;
    return password.value === confirmPassword.value;
});

const handleSubmit = async () => {
    if (!isFormValid.value) return;

    let result;
    if (isRegisterMode.value) {
        result = await signUp(email.value, password.value);
    } else {
        result = await signIn(email.value, password.value);
    }

    if (result.success) {
        emit("success", result.user);
    }
};

const switchMode = () => {
    localMode.value = isRegisterMode.value ? "login" : "register";
    authError.value = null;
    email.value = "";
    password.value = "";
    confirmPassword.value = "";
};

const handleClose = () => {
    emit("close");
};
</script>

<template>
    <Transition name="modal">
        <div v-if="isOpen" class="auth-modal-overlay" @click="handleClose">
            <div class="auth-modal" @click.stop>
                <button class="close-btn" @click="handleClose" title="Cerrar">
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

                <div class="auth-header">
                    <h2>
                        {{ isRegisterMode ? "Crear Cuenta" : "Iniciar Sesión" }}
                    </h2>
                    <p class="auth-subtitle">
                        {{
                            isRegisterMode
                                ? "Regístrate para sincronizar tus tareas"
                                : "Accede a tu cuenta para sincronizar"
                        }}
                    </p>
                </div>

                <form @submit.prevent="handleSubmit" class="auth-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input
                            id="email"
                            v-model="email"
                            type="email"
                            placeholder="tu@email.com"
                            required
                            autocomplete="email"
                            :disabled="isLoading"
                        />
                    </div>

                    <div class="form-group">
                        <label for="password">Contraseña</label>
                        <input
                            id="password"
                            v-model="password"
                            type="password"
                            :placeholder="
                                isRegisterMode
                                    ? 'Mínimo 6 caracteres'
                                    : 'Tu contraseña'
                            "
                            required
                            autocomplete="current-password"
                            :disabled="isLoading"
                            minlength="6"
                        />
                    </div>

                    <div v-if="isRegisterMode" class="form-group">
                        <label for="confirmPassword"
                            >Confirmar Contraseña</label
                        >
                        <input
                            id="confirmPassword"
                            v-model="confirmPassword"
                            type="password"
                            placeholder="Repite tu contraseña"
                            required
                            autocomplete="new-password"
                            :disabled="isLoading"
                            minlength="6"
                        />
                        <p
                            v-if="!passwordsMatch && confirmPassword"
                            class="password-error"
                        >
                            Las contraseñas no coinciden
                        </p>
                    </div>

                    <div v-if="authError" class="auth-error">
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
                        {{ authError }}
                    </div>

                    <button
                        type="submit"
                        class="auth-submit-btn"
                        :disabled="!isFormValid || isLoading"
                    >
                        <span v-if="isLoading" class="spinner"></span>
                        <span v-else>{{
                            isRegisterMode ? "Crear Cuenta" : "Iniciar Sesión"
                        }}</span>
                    </button>
                </form>

                <div class="auth-footer">
                    <p>
                        {{
                            isRegisterMode
                                ? "¿Ya tienes cuenta?"
                                : "¿No tienes cuenta?"
                        }}
                        <button
                            type="button"
                            @click="switchMode"
                            class="switch-mode-btn"
                        >
                            {{
                                isRegisterMode
                                    ? "Iniciar Sesión"
                                    : "Crear Cuenta"
                            }}
                        </button>
                    </p>
                </div>

                <div v-if="isRegisterMode" class="auth-note">
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
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p>
                        Tu data se sincronizará automáticamente cada 30 segundos
                    </p>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.auth-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

.auth-modal {
    background: var(--card-bg);
    border-radius: 24px;
    padding: 32px;
    max-width: 400px;
    width: 100%;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.4s ease;
}

.close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: transparent;
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.auth-header {
    text-align: center;
    margin-bottom: 32px;
}

.auth-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.auth-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 24px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
}

.form-group input {
    padding: 12px 16px;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    transition: all 0.2s;
}

.form-group input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.password-error {
    font-size: 12px;
    color: #ff3b30;
    margin-top: 4px;
}

.auth-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    border-radius: 8px;
    color: #ff3b30;
    font-size: 14px;
}

.dark-theme .auth-error {
    background: rgba(255, 69, 58, 0.15);
    border-color: rgba(255, 69, 58, 0.4);
    color: #ff453a;
}

.auth-submit-btn {
    padding: 16px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
}

.auth-submit-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(10, 132, 255, 0.3);
}

.auth-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
}

.spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.auth-footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 14px;
}

.switch-mode-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
    padding: 4px;
    margin-left: 4px;
    transition: all 0.2s;
}

.switch-mode-btn:hover {
    text-decoration: underline;
}

.auth-note {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(10, 132, 255, 0.1);
    border: 1px solid rgba(10, 132, 255, 0.3);
    border-radius: 8px;
    color: var(--accent);
    font-size: 13px;
    margin-top: 20px;
}

.dark-theme .auth-note {
    background: rgba(10, 132, 255, 0.15);
    border-color: rgba(10, 132, 255, 0.4);
}

.auth-note svg {
    flex-shrink: 0;
}

.auth-note p {
    line-height: 1.4;
}

/* Animaciones */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-active .auth-modal,
.modal-leave-active .auth-modal {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .auth-modal {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
}

.modal-leave-to .auth-modal {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
}

@media (max-width: 768px) {
    .auth-modal {
        padding: 24px;
        max-width: 90vw;
    }

    .auth-header h2 {
        font-size: 20px;
    }

    .auth-submit-btn {
        padding: 14px;
        font-size: 15px;
    }
}
</style>
