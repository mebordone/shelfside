import { beforeEach, describe, expect, it, vi } from "vitest";

describe("theme.svelte", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.resetModules();
  });

  it("por defecto usa dark", async () => {
    const { theme } = await import("./theme.svelte");
    expect(theme.mode).toBe("dark");
  });

  it("lee light desde localStorage al importar", async () => {
    localStorage.setItem("shelfside-theme", "light");
    vi.resetModules();
    const { theme } = await import("./theme.svelte");
    expect(theme.mode).toBe("light");
  });

  it("setTheme persiste y sincroniza la clase dark en html", async () => {
    const { setTheme, theme } = await import("./theme.svelte");
    setTheme("dark");
    expect(theme.mode).toBe("dark");
    expect(localStorage.getItem("shelfside-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("initTheme aplica la clase según el modo actual", async () => {
    localStorage.setItem("shelfside-theme", "dark");
    vi.resetModules();
    const { initTheme, theme } = await import("./theme.svelte");
    document.documentElement.classList.remove("dark");
    initTheme();
    expect(theme.mode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
