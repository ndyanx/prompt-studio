import { ref, onMounted } from "vue";

export function useTheme() {
  const THEME_KEY = "prompt-studio-theme";
  const isDark = ref(false);

  const initTheme = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      isDark.value = stored === "dark";
    } else {
      // Detectar preferencia del sistema
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme();
  };

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
    }
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    localStorage.setItem(THEME_KEY, isDark.value ? "dark" : "light");
    applyTheme();
  };

  // Para cambios en la preferencia del sistema
  onMounted(() => {
    initTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        isDark.value = e.matches;
        applyTheme();
      }
    });
  });

  return {
    isDark,
    toggleTheme,
    initTheme,
  };
}
