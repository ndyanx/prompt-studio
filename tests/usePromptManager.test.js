import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock de Supabase ANTES de importar el composable ───────────────────────
// Le decimos a Vitest: "cuando alguien importe supabaseClient, devuelve esto"
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null }, // simula usuario NO autenticado
      }),
    },
  },
}));

// ─── Imports DESPUÉS del mock ────────────────────────────────────────────────
import { usePromptManager } from "@/composables/usePromptManager";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("usePromptManager — serializeMedia", () => {
  beforeEach(() => {
    // Reinicia el estado singleton entre tests
    const { mediaList } = usePromptManager();
    mediaList.value = [{ url_post: "", url_video: "" }];
  });

  it("mediaList inicia con un slot vacío", () => {
    const { mediaList } = usePromptManager();
    expect(mediaList.value).toHaveLength(1);
    expect(mediaList.value[0]).toEqual({ url_post: "", url_video: "" });
  });

  it("addMediaSlot agrega un slot vacío", async () => {
    const { mediaList, addMediaSlot } = usePromptManager();
    await addMediaSlot();
    expect(mediaList.value).toHaveLength(2);
    expect(mediaList.value[1]).toEqual({ url_post: "", url_video: "" });
  });

  it("removeMediaSlot elimina el slot correcto", async () => {
    const { mediaList, addMediaSlot, removeMediaSlot } = usePromptManager();
    await addMediaSlot();
    mediaList.value[0] = { url_post: "https://a.com", url_video: "" };
    mediaList.value[1] = { url_post: "https://b.com", url_video: "" };

    await removeMediaSlot(0);

    expect(mediaList.value).toHaveLength(1);
    expect(mediaList.value[0].url_post).toBe("https://b.com");
  });

  it("removeMediaSlot no borra si solo hay un slot", async () => {
    const { mediaList, removeMediaSlot } = usePromptManager();
    mediaList.value = [{ url_post: "https://a.com", url_video: "" }];
    await removeMediaSlot(0);
    expect(mediaList.value).toHaveLength(1);
  });
});
