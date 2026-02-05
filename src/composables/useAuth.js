import { ref, computed, onMounted } from "vue";
import { supabase } from "../supabase/supabaseClient";

export function useAuth() {
  const user = ref(null);
  const isLoading = ref(true);
  const authError = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  const initAuth = async () => {
    try {
      isLoading.value = true;
      authError.value = null;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      user.value = session?.user || null;

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user || null;
      });
    } catch (error) {
      console.error("❌ Error en auth:", error);
      authError.value = error.message;
    } finally {
      isLoading.value = false;
    }
  };

  const signUp = async (email, password) => {
    try {
      authError.value = null;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      user.value = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      authError.value = null;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      user.value = data.user;

      // Emitir evento para que otros componentes restauren datos si es necesario
      window.dispatchEvent(new CustomEvent("user-signed-in"));

      return { success: true, user: data.user };
    } catch (error) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      user.value = null;

      // Emitir evento personalizado para que otros componentes limpien sus datos
      window.dispatchEvent(new CustomEvent("user-signed-out"));

      return { success: true };
    } catch (error) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  onMounted(() => {
    initAuth();
  });

  return {
    user,
    isLoading,
    authError,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    initAuth,
  };
}
