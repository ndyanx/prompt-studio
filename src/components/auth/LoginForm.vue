<script setup>
import { ref } from "vue";

const emit = defineEmits(["submit", "switch-to-signup"]);

const email = ref("");
const password = ref("");
const showPassword = ref(false);

const handleSubmit = () => {
    if (!email.value || !password.value) return;
    emit("submit", {
        email: email.value,
        password: password.value,
    });
};
</script>

<template>
    <div class="auth-form">
        <div class="auth-header">
            <h2>Iniciar Sesión</h2>
            <p>Accede a tu cuenta para sincronizar tus tareas</p>
        </div>

        <form @submit.prevent="handleSubmit" class="form">
            <div class="form-group">
                <label for="email">Email</label>
                <input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    autocomplete="email"
                />
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <div class="password-input">
                    <input
                        id="password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="••••••••"
                        required
                        autocomplete="current-password"
                    />
                    <button
                        type="button"
                        class="toggle-password"
                        @click="showPassword = !showPassword"
                        :aria-label="
                            showPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                        "
                    >
                        <svg
                            v-if="!showPassword"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                            />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <svg
                            v-else
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                            />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    </button>
                </div>
            </div>

            <button type="submit" class="submit-btn">Iniciar Sesión</button>
        </form>

        <div class="auth-switch">
            <span>¿No tienes cuenta?</span>
            <button
                type="button"
                class="link-btn"
                @click="$emit('switch-to-signup')"
            >
                Regístrate
            </button>
        </div>
    </div>
</template>

<style scoped>
.auth-form {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
}

.auth-header {
    text-align: center;
    margin-bottom: 32px;
}

.auth-header h2 {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.auth-header p {
    font-size: 14px;
    color: var(--text-secondary);
}

.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    font-size: 15px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-bg);
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}

.password-input {
    position: relative;
    display: flex;
    align-items: center;
}

.password-input input {
    flex: 1;
    padding-right: 48px;
}

.toggle-password {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
}

.toggle-password:hover {
    color: var(--text-primary);
}

.submit-btn {
    padding: 14px 24px;
    font-size: 15px;
    font-weight: 600;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 8px;
}

.submit-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.submit-btn:active {
    transform: translateY(0);
}

.auth-switch {
    text-align: center;
    margin-top: 24px;
    font-size: 14px;
    color: var(--text-secondary);
}

.link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 4px 0;
    transition: opacity 0.2s ease;
    margin-left: 4px;
}

.link-btn:hover {
    opacity: 0.8;
}

@media (max-width: 480px) {
    .auth-form {
        max-width: 100%;
        padding: 0 16px;
    }

    .auth-header h2 {
        font-size: 24px;
    }
}
</style>
