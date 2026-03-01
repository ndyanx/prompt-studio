/**
 * Constantes de eventos globales del DOM usados para comunicación entre stores.
 *
 * Emisores → Receptores:
 *
 * SIGNED_IN    → useAuthStore (signIn)        → useSyncStore (handleSignIn)
 * SIGNED_OUT   → useAuthStore (signOut)       → useSyncStore (handleSignOut), usePromptStore (clearLocalData)
 * DATA_RESTORED → useSyncStore (handleSignIn/handleSignOut) → usePromptStore (reloadTasks)
 * CREATE_DEFAULT_TASK → useSyncStore (initSync/handleSignIn) → usePromptStore (createNewTask)
 */

export const APP_EVENTS = {
  SIGNED_IN: "user-signed-in",
  SIGNED_OUT: "user-signed-out",
  DATA_RESTORED: "data-restored",
  CREATE_DEFAULT_TASK: "create-default-task",
};

/** Helper para emitir eventos sin errores de typo */
export const emit = (eventName) =>
  window.dispatchEvent(new CustomEvent(eventName));
