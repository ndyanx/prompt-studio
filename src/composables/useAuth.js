import { ref, computed, onMounted } from "vue";
import { supabase } from "./supabaseClient";

const user = ref(null);
const userProfile = ref(null);
const loading = ref(false);
const error = ref(null);

// Flag para evitar múltiples inicializaciones del listener
let authListenerInitialized = false;
// Flag para controlar si estamos en proceso de logout
let isLoggingOut = false;

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);
  const isSupabaseEnabled = computed(() => !!supabase);

  // Cargar sesión al iniciar (solo una vez)
  onMounted(async () => {
    if (!supabase) return;

    // Evitar múltiples inicializaciones
    if (authListenerInitialized) return;
    authListenerInitialized = true;

    try {
      loading.value = true;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        user.value = session.user;
        await loadUserProfile(session.user.id);
      }

      // Escuchar cambios en autenticación (solo una vez)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event);

        // Ignorar cambios durante el logout
        if (isLoggingOut) {
          console.log("Ignorando cambio de auth durante logout");
          return;
        }

        if (session?.user) {
          user.value = session.user;
          await loadUserProfile(session.user.id);
        } else {
          user.value = null;
          userProfile.value = null;
        }
      });
    } catch (err) {
      console.error("Error loading session:", err);
    } finally {
      loading.value = false;
    }
  });

  // Cargar perfil de usuario
  const loadUserProfile = async (userId) => {
    if (!supabase) return;

    try {
      const { data, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          console.log("Profile not found, will be created automatically");
        } else {
          console.error("Error loading profile:", profileError);
        }
        return;
      }

      userProfile.value = data;
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  // Registro
  const signUp = async ({ email, password }) => {
    if (!supabase) {
      error.value = "Supabase no está configurado";
      return { success: false, error: error.value };
    }

    try {
      loading.value = true;
      error.value = null;

      if (!email || !email.includes("@")) {
        throw new Error("Email inválido");
      }

      if (!password || password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario");
      }

      // Si hay sesión, establecer el usuario
      if (authData.session) {
        user.value = authData.user;

        // Esperar un poco para que el trigger cree el perfil
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await loadUserProfile(authData.user.id);
      }

      return {
        success: true,
        needsEmailConfirmation: !authData.session,
      };
    } catch (err) {
      error.value = err.message;
      return {
        success: false,
        error: err.message,
      };
    } finally {
      loading.value = false;
    }
  };

  // Login
  const signIn = async ({ email, password }) => {
    if (!supabase) {
      error.value = "Supabase no está configurado";
      return { success: false, error: error.value };
    }

    try {
      loading.value = true;
      error.value = null;

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      user.value = data.user;
      await loadUserProfile(data.user.id);

      return { success: true };
    } catch (err) {
      error.value = err.message;
      return {
        success: false,
        error: err.message,
      };
    } finally {
      loading.value = false;
    }
  };

  // Logout
  const signOut = async () => {
    if (!supabase) {
      return { success: false, error: "Supabase no configurado" };
    }

    try {
      loading.value = true;
      error.value = null;

      // Activar flag de logout para ignorar eventos de auth
      isLoggingOut = true;

      console.log("🔓 Iniciando signOut de Supabase...");

      // Hacer signOut de Supabase (esto limpia localStorage automáticamente)
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error("❌ Sign out error:", signOutError);
        throw signOutError;
      }

      // Limpiar estado local inmediatamente
      user.value = null;
      userProfile.value = null;

      console.log("✅ Sign out de Supabase exitoso");

      // Dar un pequeño delay para asegurar que localStorage se limpió
      await new Promise((resolve) => setTimeout(resolve, 100));

      return { success: true };
    } catch (err) {
      console.error("❌ Error in signOut:", err);
      error.value = err.message;
      return {
        success: false,
        error: err.message,
      };
    } finally {
      loading.value = false;
      // Resetear flag después de un delay
      setTimeout(() => {
        isLoggingOut = false;
      }, 500);
    }
  };

  return {
    // Estado
    user,
    userProfile,
    loading,
    error,
    isAuthenticated,
    isSupabaseEnabled,

    // Métodos
    signUp,
    signIn,
    signOut,

    // Exportar cliente para usar en otros composables
    supabase,
  };
}
