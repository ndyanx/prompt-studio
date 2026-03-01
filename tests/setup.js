import "fake-indexeddb/auto";
import { vi } from "vitest";

// Silencia warnings de Vue sobre lifecycle hooks fuera de componentes
// Son esperados al testear composables directamente
vi.spyOn(console, "warn").mockImplementation((msg) => {
  if (msg?.includes?.("[Vue warn]")) return;
  console.warn(msg);
});
