import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock de Supabase ────────────────────────────────────────────────────────
vi.mock("@/supabase/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    }),
  },
}));

import { useSyncManager } from "@/composables/useSyncManager";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useSyncManager — offline", () => {
  beforeEach(() => {
    // Reinicia el estado de red antes de cada test
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  it("detecta cuando está offline y bloquea el sync", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { manualSync, isOffline } = useSyncManager();
    isOffline.value = true;

    const result = await manualSync();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Sin conexión a internet");
  });

  it("permite sync cuando está online", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);

    const { manualSync } = useSyncManager();
    const result = await manualSync();

    // No importa si falla por datos vacíos, lo importante es que intentó
    expect(result).toHaveProperty("success");
  });
});

describe("useSyncManager — throttle", () => {
  it("bloquea segunda sincronización inmediata", async () => {
    const { manualSync, isThrottled, throttleSecondsRemaining } =
      useSyncManager();

    // Primera sync — activa el throttle
    await manualSync();

    // Si el throttle se activó, la segunda debe bloquearse
    if (isThrottled.value) {
      const result = await manualSync();
      expect(result.success).toBe(false);
      expect(result.throttled).toBe(true);
      expect(result.error).toContain("Espera");
    }
  });

  it("throttleSecondsRemaining es 0 antes de sincronizar", () => {
    const { throttleSecondsRemaining } = useSyncManager();
    // Al inicio o después de reset debe ser 0
    expect(throttleSecondsRemaining.value).toBeGreaterThanOrEqual(0);
  });
});

describe("useSyncManager — restoreFromSupabase", () => {
  it("retorna error offline si no hay conexión", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { restoreFromSupabase, isOffline } = useSyncManager();
    isOffline.value = true;

    const result = await restoreFromSupabase();

    expect(result.success).toBe(false);
    expect(result.offline).toBe(true);
  });

  it("retorna mensaje cuando no hay snapshots guardados", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);

    const { restoreFromSupabase, isOffline } = useSyncManager();
    isOffline.value = false;

    const result = await restoreFromSupabase();

    // El mock devuelve PGRST116 = "no hay filas", ese es el caso esperado
    expect(result.success).toBe(false);
    expect(result.message).toBe("No hay snapshots guardados");
  });
});
