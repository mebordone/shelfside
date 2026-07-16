import { describe, expect, it, vi } from "vitest";
import { isShelfsideSyncDir, validateSyncFolderPath } from "./validateSyncFolder";

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("isShelfsideSyncDir", () => {
  it("detecta carpeta shelfside", () => {
    expect(isShelfsideSyncDir("/home/me/Sync/shelfside")).toBe(true);
    expect(isShelfsideSyncDir("/home/me/Sync/shelfside/")).toBe(true);
    expect(isShelfsideSyncDir("/home/me/Sync")).toBe(false);
  });
});

describe("validateSyncFolderPath", () => {
  it("rechaza vacío", async () => {
    const r = await validateSyncFolderPath("  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("crea Sync/shelfside si se pasa la raíz Syncthing", async () => {
    const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
    vi.mocked(exists).mockResolvedValue(false);
    const r = await validateSyncFolderPath("/home/me/Sync");
    expect(mkdir).toHaveBeenCalledWith("/home/me/Sync/shelfside", { recursive: true });
    expect(r).toEqual({ ok: true, path: "/home/me/Sync/shelfside" });
  });

  it("no anida shelfside si ya apunta a shelfside", async () => {
    const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(mkdir).mockClear();
    const r = await validateSyncFolderPath("/home/me/Sync/shelfside");
    expect(mkdir).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true, path: "/home/me/Sync/shelfside" });
  });
});
