import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("mobileLayout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("es false por defecto en jsdom sin Android ni matchMedia móvil", async () => {
    const { mobileLayout, initMobileLayout, destroyMobileLayout } = await import(
      "./mobileLayout.svelte"
    );
    const cleanup = initMobileLayout();
    expect(mobileLayout.current).toBe(false);
    cleanup();
    destroyMobileLayout();
  });

  it("es true cuando matchMedia coincide con el breakpoint", async () => {
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("767"),
      media: query,
      addEventListener: (_: string, fn: () => void) => {
        listeners.add(fn);
      },
      removeEventListener: (_: string, fn: () => void) => {
        listeners.delete(fn);
      },
    }));

    const { mobileLayout, initMobileLayout } = await import("./mobileLayout.svelte");
    const cleanup = initMobileLayout();
    expect(mobileLayout.current).toBe(true);
    cleanup();
  });

  it("es true en Android aunque el viewport sea ancho", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)" });
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    const { mobileLayout, initMobileLayout } = await import("./mobileLayout.svelte");
    const cleanup = initMobileLayout();
    expect(mobileLayout.current).toBe(true);
    cleanup();
  });
});
