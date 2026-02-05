<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import Header from "./components/Header.vue";
import TasksPanel from "./components/TasksPanel.vue";
import MobileTabBar from "./components/MobileTabBar.vue";
import AuthContainer from "./components/auth/AuthContainer.vue";
import { usePromptManager } from "./composables/usePromptManager";
import { useTheme } from "./composables/useTheme";
import { useAuth } from "./composables/useAuth";

const { isDark, toggleTheme } = useTheme();
const promptManager = usePromptManager();
const auth = useAuth();

const activeSlot = ref(null);
const showTasks = ref(false);
const isMobile = ref(false);
const activeView = ref("config");
const showAuth = ref(false);
const isSigningOut = ref(false); // Flag para evitar múltiples clicks

let resizeTimeout = null;

const checkMobile = () => {
    isMobile.value = window.innerWidth <= 1024;
};

const debouncedCheckMobile = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkMobile, 150);
};

onMounted(() => {
    checkMobile();
    window.addEventListener("resize", debouncedCheckMobile);
});

onUnmounted(() => {
    window.removeEventListener("resize", debouncedCheckMobile);
    clearTimeout(resizeTimeout);
});

// Vigilar cambios en parsedColors
watch(
    () => promptManager.parsedColors.value,
    (newColors) => {
        if (activeSlot.value) {
            const stillExists = newColors.some(
                (color) => color.key === activeSlot.value,
            );
            if (!stillExists) {
                activeSlot.value = null;
            }
        }
    },
    { deep: true },
);

const handleTabClick = (key) => {
    if (activeSlot.value === key) {
        activeSlot.value = null;
    } else {
        activeSlot.value = key;
    }
};

const showConfig = computed(
    () => !isMobile.value || activeView.value === "config",
);
const showPreview = computed(
    () => !isMobile.value || activeView.value === "preview",
);

// ========================================
// HANDLERS DE AUTENTICACIÓN CON SINCRONIZACIÓN
// ========================================

const handleLogin = async (credentials) => {
    const result = await auth.signIn(credentials);
    if (result.success && auth.supabase && auth.user.value) {
        showAuth.value = false;

        // Sincronizar tareas: LOGIN = reemplazar locales con remotas
        try {
            await promptManager.handleUserLogin(
                auth.user.value.id,
                auth.supabase,
            );
            console.log("✅ Tareas sincronizadas después del login");
        } catch (error) {
            console.error("❌ Error al sincronizar tareas:", error);
            alert("Error al cargar tus tareas. Por favor recarga la página.");
        }
    }
};

const handleSignup = async (userData) => {
    const result = await auth.signUp(userData);
    if (result.success && auth.supabase && auth.user.value) {
        showAuth.value = false;

        if (result.needsEmailConfirmation) {
            alert("Por favor, verifica tu email para completar el registro");
        } else {
            // Sincronizar tareas: SIGNUP = subir locales a remoto
            try {
                await promptManager.handleUserSignup(
                    auth.user.value.id,
                    auth.supabase,
                );
                console.log(
                    "✅ Tareas locales sincronizadas después del registro",
                );
            } catch (error) {
                console.error("❌ Error al sincronizar tareas:", error);
                alert(
                    "Error al guardar tus tareas. Por favor recarga la página.",
                );
            }
        }
    }
};

const handleSignOut = async () => {
    // Evitar múltiples clicks
    if (isSigningOut.value) {
        console.log("⚠️ Logout ya en proceso, ignorando...");
        return;
    }

    console.log("🔓 Iniciando proceso de logout...");
    isSigningOut.value = true;

    try {
        // Verificar si hay operaciones pendientes
        if (promptManager.pendingSupabaseOps.value > 0) {
            console.log(
                `⏳ Esperando ${promptManager.pendingSupabaseOps.value} operaciones pendientes...`,
            );
        }

        // 1. PRIMERO: Hacer signOut de Supabase (limpia localStorage de auth)
        const result = await auth.signOut();

        if (!result.success) {
            console.error(
                "❌ Error al cerrar sesión de Supabase:",
                result.error,
            );
            alert("Error al cerrar sesión: " + result.error);
            return;
        }

        console.log("✅ Sesión de Supabase cerrada");

        // 2. SEGUNDO: Limpiar la sincronización de tareas (espera operaciones pendientes)
        await promptManager.handleUserLogout();
        console.log("✅ Tareas limpiadas y tarea por defecto creada");

        console.log("✅ Logout completado exitosamente");
    } catch (error) {
        console.error("❌ Error inesperado en logout:", error);
        alert("Error inesperado al cerrar sesión. Intenta recargar la página.");
    } finally {
        // Resetear el flag después de un breve delay para evitar re-clicks rápidos
        setTimeout(() => {
            isSigningOut.value = false;
        }, 1000);
    }
};

const openAuth = () => {
    showAuth.value = true;
};

const clearAuthError = () => {
    auth.error.value = null;
};
</script>

<template>
    <div class="app-container">
        <Header
            :is-dark="isDark"
            :is-mobile="isMobile"
            :user="auth.user.value"
            :user-profile="auth.userProfile.value"
            :is-authenticated="auth.isAuthenticated.value"
            :is-supabase-enabled="auth.isSupabaseEnabled.value"
            :is-signing-out="isSigningOut"
            :pending-ops="promptManager.pendingSupabaseOps.value"
            @toggle-theme="toggleTheme"
            @open-auth="openAuth"
            @sign-out="handleSignOut"
        />

        <div class="app-wrapper">
            <ConfigPanel
                v-show="showConfig"
                :parsed-colors="promptManager.parsedColors.value"
                :color-selections="promptManager.colorSelections"
                :active-slot="activeSlot"
                :current-task="promptManager.currentTask.value"
                :all-tasks="promptManager.tasks.value"
                :is-mobile="isMobile"
                :url-post="promptManager.urlPost.value"
                :url-video="promptManager.urlVideo.value"
                @set-active="handleTabClick"
                @update-color="promptManager.updateColor"
                @update-task-name="promptManager.updateTaskName"
                @show-tasks="showTasks = true"
                @export-tasks="promptManager.exportTasks"
                @update-video-urls="promptManager.updateVideoUrls"
            />

            <PreviewPanel
                v-show="showPreview"
                :prompt-text="promptManager.promptText.value"
                :final-prompt="promptManager.finalPrompt.value"
                :parsed-colors="promptManager.parsedColors.value"
                :color-selections="promptManager.colorSelections"
                :is-mobile="isMobile"
                @update-prompt="promptManager.promptText.value = $event"
            />

            <MobileTabBar
                v-if="isMobile"
                :active-view="activeView"
                @change-view="activeView = $event"
            />

            <TasksPanel
                v-if="showTasks"
                :tasks="promptManager.tasks.value"
                :current-task="promptManager.currentTask.value"
                @close="showTasks = false"
                @load-task="promptManager.loadTask"
                @create-task="promptManager.createNewTask"
                @delete-task="promptManager.deleteTask"
                @duplicate-task="promptManager.duplicateTask"
            />
        </div>

        <!-- Modal de autenticación -->
        <AuthContainer
            v-if="showAuth"
            :loading="auth.loading.value"
            :error="auth.error.value"
            @login="handleLogin"
            @signup="handleSignup"
            @close="showAuth = false"
            @clear-error="clearAuthError"
        />
    </div>
</template>

<style scoped>
.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.app-wrapper {
    display: flex;
    flex: 1;
    margin-top: 60px;
    height: calc(100vh - 60px);
    width: 100vw;
    position: relative;
    overflow: hidden;
}
</style>
