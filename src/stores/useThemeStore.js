import { defineStore } from "pinia";
import { ref } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const THEME_KEY = "prompt-studio-theme";
  const isDark = ref(false);

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
    }
  };

  const initTheme = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      isDark.value = stored === "dark";
    } else {
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme();

    // Escuchar cambios en la preferencia del sistema
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
          isDark.value = e.matches;
          applyTheme();
        }
      });
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    localStorage.setItem(THEME_KEY, isDark.value ? "dark" : "light");
    applyTheme();
  };

  return {
    isDark,
    initTheme,
    toggleTheme,
  };
});
