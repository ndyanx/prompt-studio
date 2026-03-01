import { createApp } from "vue";
import { createPinia } from "pinia";
import "./assets/styles/main.css";
import App from "./App.vue";

// Importar stores para inicializarlos al arrancar
import { useAuthStore } from "./stores/useAuthStore";
import { usePromptStore } from "./stores/usePromptStore";
import { useSyncStore } from "./stores/useSyncStore";
import { useThemeStore } from "./stores/useThemeStore";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");

// Inicializar stores en orden correcto:
// 1. Tema (sin dependencias)
// 2. Auth (sin dependencias de otros stores)
// 3. Sync (orquesta la restauración de datos)
// 4. Prompt (reacciona a los eventos de sync y auth)
const themeStore = useThemeStore();
themeStore.initTheme();

const authStore = useAuthStore();
authStore.initAuth();

const syncStore = useSyncStore();
syncStore.initSync();

const promptStore = usePromptStore();
promptStore.init();
