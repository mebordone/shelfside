import { beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn();
const downloadDir = vi.fn();
const join = vi.fn((...parts: string[]) => parts.join("/"));
const mkdir = vi.fn().mockResolvedValue(undefined);
const ensureLibraryDir = vi.fn(async (syncDir: string) => `${syncDir}/library`);

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => save(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  downloadDir: () => downloadDir(),
  join: (...parts: string[]) => join(...parts),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: (...args: unknown[]) => mkdir(...args),
}));

vi.mock("$lib/sync/libraryDir", () => ({
  ensureLibraryDir: (syncDir: string) => ensureLibraryDir(syncDir),
}));

vi.mock("$lib/platform", () => ({
  isAndroidPlatform: vi.fn(() => false),
}));

describe("saveDestination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    downloadDir.mockResolvedValue("/home/me/Downloads");
  });

  it("usa syncFolder/library cuando hay carpeta sync", async () => {
    const { resolveMarkdownExportDestination } = await import("./saveDestination");
    const r = await resolveMarkdownExportDestination("/vault/sync");
    expect(r).toEqual({ libraryDir: "/vault/sync/library", usedDownloadFallback: false });
  });

  it("cae a Descargas/shelfside-library sin sync", async () => {
    const { resolveMarkdownExportDestination } = await import("./saveDestination");
    const r = await resolveMarkdownExportDestination(null);
    expect(r.usedDownloadFallback).toBe(true);
    expect(r.libraryDir).toBe("/home/me/Downloads/shelfside-library");
    expect(mkdir).toHaveBeenCalled();
  });

  it("resolveSavePath: picked o cancelado", async () => {
    const { resolveSavePath } = await import("./saveDestination");
    save.mockResolvedValueOnce("/home/me/Downloads/out.db");
    await expect(
      resolveSavePath({ defaultPath: "x.db", filters: [{ name: "SQLite", extensions: ["db"] }] }),
    ).resolves.toEqual({ kind: "picked", path: "/home/me/Downloads/out.db" });

    save.mockResolvedValueOnce(null);
    await expect(
      resolveSavePath({ defaultPath: "x.db", filters: [{ name: "SQLite", extensions: ["db"] }] }),
    ).resolves.toEqual({ kind: "cancelled" });
  });

  it("resolveSavePath: fallback Android si save falla", async () => {
    const { isAndroidPlatform } = await import("$lib/platform");
    vi.mocked(isAndroidPlatform).mockReturnValue(true);
    save.mockRejectedValueOnce(new Error("unsupported"));
    const { resolveSavePath } = await import("./saveDestination");
    await expect(
      resolveSavePath({ defaultPath: "backup.db", filters: [{ name: "SQLite", extensions: ["db"] }] }),
    ).resolves.toEqual({ kind: "fallback", path: "/home/me/Downloads/backup.db" });
  });
});
