import { describe, expect, it, vi, beforeEach } from "vitest";
import * as catalog from "$lib/db/catalog";
import * as library from "$lib/db/library";
import { cleanSyncRecycleBin, previewCleanSyncRecycleBin } from "./cleanSyncRecycleBin";

const TOMBSTONE = `---
shelfside_id: 42
deleted: true
deleted_at: "2026-12-01T00:00:00.000Z"
updated_at: "2026-12-01T00:00:00.000Z"
title: "Dune"
media_type: movie
source: tmdb
external_id: "1"
status: planning
score: null
current_season: null
last_episode_watched: null
progress_current: null
progress_total: null
owned: null
started_at: null
completed_at: null
image_url: null
catalog_updated_at: null
---
`;

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn().mockResolvedValue([{ name: "dune-42.md" }, { name: "other-99.md" }]),
  readTextFile: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("cleanSyncRecycleBin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue(null);
    vi.spyOn(library, "getLibraryIdForCatalog").mockResolvedValue(null);
  });

  it("elimina tombstone sin entrada local", async () => {
    const { readDir, readTextFile, remove } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readDir).mockResolvedValue([{ name: "dune-42.md" }]);
    vi.mocked(readTextFile).mockResolvedValue(TOMBSTONE);
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue(null);

    const preview = await previewCleanSyncRecycleBin({} as never, "/sync");
    expect(preview.eligible).toBe(1);
    expect(preview.skipped).toBe(0);

    const result = await cleanSyncRecycleBin({} as never, "/sync");
    expect(result.removed).toBe(1);
    expect(remove).toHaveBeenCalledWith("/sync/library/dune-42.md");
  });

  it("omite tombstone con entrada local presente", async () => {
    const { readDir, readTextFile, remove } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readDir).mockResolvedValue([{ name: "dune-42.md" }]);
    vi.mocked(readTextFile).mockResolvedValue(TOMBSTONE);
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue({ id: 42 } as never);

    const result = await cleanSyncRecycleBin({} as never, "/sync");
    expect(result.removed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
