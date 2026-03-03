/**
 * Eventos globales del DOM para comunicación entre stores.
 *
 * Emisor              → Receptor
 * SIGNED_IN           → useSyncStore (handleSignIn)
 * SIGNED_OUT          → useSyncStore (handleSignOut), usePromptStore (clearLocalData)
 * DATA_RESTORED       → usePromptStore (loadTasks)
 * CREATE_DEFAULT_TASK → usePromptStore (createNewTask)
 * REALTIME_CHANGE     → usePromptStore (handleRealtimeChange)
 */

export const APP_EVENTS = {
  SIGNED_IN: "user-signed-in",
  SIGNED_OUT: "user-signed-out",
  DATA_RESTORED: "data-restored",
  CREATE_DEFAULT_TASK: "create-default-task",
  REALTIME_CHANGE: "realtime-change",
};

export const emit = (eventName) =>
  window.dispatchEvent(new CustomEvent(eventName));
