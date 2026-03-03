import { createApp } from "vue";
import { createPinia } from "pinia";
import "./assets/styles/main.css";
import App from "./App.vue";

import { useAuthStore } from "./stores/useAuthStore";
import { usePromptStore } from "./stores/usePromptStore";
import { useSyncStore } from "./stores/useSyncStore";
import { useThemeStore } from "./stores/useThemeStore";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");

// Los stores se inicializan en orden estrictamente secuencial:
// syncStore debe terminar antes de que promptStore arranque, ya que puede
// limpiar IndexedDB y restaurar datos desde Supabase. Ejecutarlos en paralelo
// causaría BulkError ("Key already exists") durante el clear()+bulkPut().
(async () => {
  const themeStore = useThemeStore();
  themeStore.initTheme();

  const authStore = useAuthStore();
  await authStore.initAuth();

  const syncStore = useSyncStore();
  await syncStore.initSync();

  const promptStore = usePromptStore();
  await promptStore.init();
})();
