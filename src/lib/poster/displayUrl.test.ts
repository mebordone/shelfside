import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePosterDisplayUrl } from "./displayUrl";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((p: string) => `asset://localhost/${p}`),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appLocalDataDir: vi.fn().mockResolvedValue("/appdata"),
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppLocalData: 1 },
  exists: vi.fn(),
}));

describe("resolvePosterDisplayUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    vi.clearAllMocks();
  });

  it("usa URL remota si no hay poster local", async () => {
    const url = await resolvePosterDisplayUrl(null, "https://covers.openlibrary.org/b/id/1-L.jpg");
    expect(url).toBe("https://covers.openlibrary.org/b/id/1-L.jpg");
  });

  it("usa convertFileSrc si el archivo local existe", async () => {
    const { exists } = await import("@tauri-apps/plugin-fs");
    vi.mocked(exists).mockResolvedValue(true);

    const url = await resolvePosterDisplayUrl("posters/book_OL1M.jpg", "https://example.com/x.jpg");
    expect(url).toBe("asset://localhost//appdata/posters/book_OL1M.jpg");
  });

  it("vuelve a remota si el archivo local no existe", async () => {
    const { exists } = await import("@tauri-apps/plugin-fs");
    vi.mocked(exists).mockResolvedValue(false);

    const remote = "https://covers.openlibrary.org/b/id/1-L.jpg";
    const url = await resolvePosterDisplayUrl("posters/missing.jpg", remote);
    expect(url).toBe(remote);
  });
});
