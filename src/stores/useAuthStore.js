import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "../supabase/supabaseClient";
import { APP_EVENTS, emit } from "../events/events";

export const useAuthStore = defineStore("auth", () => {
  // ─── Estado ───────────────────────────────────────────────────────────────
  const user = ref(null);
  const isLoading = ref(true);
  const authError = ref(null);

  let authSubscription = null;

  // ─── Getters ──────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const initAuth = async () => {
    try {
      isLoading.value = true;
      authError.value = null;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // onAuthStateChange es la única fuente de verdad para user.value.
      // No se setea manualmente en signIn/signOut.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user || null;
      });
      authSubscription = data.subscription;

      // Valor inicial síncrono mientras llega el primer callback asíncrono
      user.value = session?.user || null;
    } catch (error) {
      console.error("Error en auth:", error);
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

      // onAuthStateChange actualizará user.value automáticamente
      emit(APP_EVENTS.SIGNED_IN);
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

      emit(APP_EVENTS.SIGNED_OUT);
      return { success: true };
    } catch (error) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  const cleanup = () => {
    authSubscription?.unsubscribe();
    authSubscription = null;
  };

  return {
    user,
    isLoading,
    authError,
    isAuthenticated,
    initAuth,
    signUp,
    signIn,
    signOut,
    cleanup,
  };
});
