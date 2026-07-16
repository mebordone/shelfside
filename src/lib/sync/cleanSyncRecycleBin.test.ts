import { describe, expect, it, vi, beforeEach } from "vitest";
import * as catalog from "$lib/db/catalog";
import * as library from "$lib/db/library";
import { cleanSyncRecycleBin, previewCleanSyncRecycleBin } from "./cleanSyncRecycleBin";
import { serializeSyncCsv, type SyncCsvRow } from "./parseCsv";

const TOMBSTONE: SyncCsvRow = {
  shelfside_id: 42,
  updated_at: "2026-12-01T00:00:00.000Z",
  deleted: true,
  deleted_at: "2026-12-01T00:00:00.000Z",
  title: "Dune",
  media_type: "movie",
  source: "tmdb",
  external_id: "1",
  status: "planning",
  score: null,
  current_season: null,
  last_episode_watched: null,
  progress_current: null,
  progress_total: null,
  owned: null,
  started_at: null,
  completed_at: null,
  image_url: null,
  catalog_updated_at: null,
  notes: "",
};

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("cleanSyncRecycleBin (CSV)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue(null);
    vi.spyOn(library, "getLibraryIdForCatalog").mockResolvedValue(null);
  });

  it("elimina filas tombstone sin entrada local", async () => {
    const { readTextFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValue(serializeSyncCsv([TOMBSTONE]));
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue(null);

    const preview = await previewCleanSyncRecycleBin({} as never, "/sync");
    expect(preview.eligible).toBe(1);
    expect(preview.skipped).toBe(0);

    const result = await cleanSyncRecycleBin({} as never, "/sync");
    expect(result.removed).toBe(1);
    expect(writeTextFile).toHaveBeenCalled();
    const content = vi.mocked(writeTextFile).mock.calls[0]![1] as string;
    expect(content).not.toContain("Dune");
  });

  it("omite tombstone con entrada local presente", async () => {
    const { readTextFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValue(serializeSyncCsv([TOMBSTONE]));
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue({ id: 42 } as never);

    const result = await cleanSyncRecycleBin({} as never, "/sync");
    expect(result.removed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(writeTextFile).not.toHaveBeenCalled();
  });
});
