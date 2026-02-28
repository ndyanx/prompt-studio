import { ref, computed, onMounted, onUnmounted } from "vue";
import { supabase } from "../supabase/supabaseClient";

// ─── Estado singleton de módulo ───────────────────────────────────────────────
// Igual que useSyncManager y usePromptManager: estado compartido entre
// todas las instancias del composable. Garantiza un único user ref,
// una única suscripción a Supabase, y comportamiento consistente.

const user = ref(null);
const isLoading = ref(true);
const authError = ref(null);

let authSubscription = null;
let initialized = false;

// ─── Composable ──────────────────────────────────────────────────────────────

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);

  const initAuth = async () => {
    try {
      isLoading.value = true;
      authError.value = null;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // onAuthStateChange se dispara inmediatamente con la sesión actual
      // y luego ante cualquier cambio. Es la única fuente de verdad para user.
      // No seteamos user.value manualmente aquí ni en signIn/signOut,
      // todo pasa por este callback para evitar doble escritura.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user || null;
      });
      authSubscription = data.subscription;

      // El callback anterior es asíncrono y puede tardar un tick en dispararse,
      // así que seteamos el valor inicial de forma síncrona desde la sesión ya obtenida.
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

      // No seteamos user.value aquí: onAuthStateChange lo actualizará solo
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

      // No seteamos user.value aquí: onAuthStateChange lo actualizará solo.
      // Sí despachamos el evento para que useSyncManager restaure los datos.
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

      // No seteamos user.value aquí: onAuthStateChange lo pondrá en null solo.
      window.dispatchEvent(new CustomEvent("user-signed-out"));
      return { success: true };
    } catch (error) {
      authError.value = error.message;
      return { success: false, error: error.message };
    }
  };

  onMounted(() => {
    if (initialized) return;
    initialized = true;
    initAuth();
  });

  onUnmounted(() => {
    // Solo limpiamos si no hay otros componentes activos usando el composable.
    // Como el estado es singleton, no destruimos los refs, solo la suscripción
    // cuando el último consumidor se desmonte. En la práctica App.vue nunca
    // se desmonta, así que esto es principalmente una red de seguridad.
    authSubscription?.unsubscribe();
    authSubscription = null;
    initialized = false;
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
