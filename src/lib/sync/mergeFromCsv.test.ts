import { describe, expect, it, vi } from "vitest";
import * as catalog from "$lib/db/catalog";
import * as library from "$lib/db/library";
import { mergeFromSyncCsv } from "./mergeFromCsv";
import { serializeSyncCsv, type SyncCsvRow } from "./parseCsv";

function liveCsv(overrides: Partial<SyncCsvRow> = {}): string {
  const row: SyncCsvRow = {
    shelfside_id: 42,
    updated_at: "2026-06-01T00:00:00.000Z",
    deleted: false,
    deleted_at: null,
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
    ...overrides,
  };
  return serializeSyncCsv([row]);
}

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  readTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

vi.mock("$lib/poster", () => ({
  removePosterFile: vi.fn().mockResolvedValue(undefined),
}));

describe("mergeFromSyncCsv", () => {
  it("importa entrada nueva", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValue(liveCsv());
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue(null);
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue(null);
    vi.spyOn(catalog, "insertCatalogItem").mockResolvedValue(10);
    const execute = vi.fn().mockResolvedValue({});
    const db = { select: vi.fn(), execute };

    const result = await mergeFromSyncCsv(db as never, "/sync");
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(execute).toHaveBeenCalled();
  });

  it("omite si local es más reciente", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValue(liveCsv());
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue({
      id: 42,
      catalog_item_id: 10,
      status: "planning",
      score: null,
      current_season: null,
      last_episode_watched: null,
      progress_current: null,
      progress_total: null,
      owned: null,
      started_at: null,
      completed_at: null,
      notes: null,
      updated_at: "2026-12-01T00:00:00.000Z",
      media_type: "movie",
      source: "tmdb",
      external_id: "1",
      title: "Dune",
      image_url: null,
      poster_local_path: null,
      metadata_json: null,
    });

    const result = await mergeFromSyncCsv({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it("aplica tombstone si deleted_at es más reciente", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const { removePosterFile } = await import("$lib/poster");
    vi.mocked(readTextFile).mockResolvedValue(
      liveCsv({
        deleted: true,
        deleted_at: "2026-12-01T00:00:00.000Z",
        updated_at: "2026-12-01T00:00:00.000Z",
      }),
    );
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue({
      id: 42,
      catalog_item_id: 10,
      status: "planning",
      score: null,
      current_season: null,
      last_episode_watched: null,
      progress_current: null,
      progress_total: null,
      owned: null,
      started_at: null,
      completed_at: null,
      notes: null,
      updated_at: "2026-06-01T00:00:00.000Z",
      media_type: "movie",
      source: "tmdb",
      external_id: "1",
      title: "Dune",
      image_url: null,
      poster_local_path: "posters/x.jpg",
      metadata_json: null,
    });
    vi.spyOn(library, "deleteLibraryEntry").mockResolvedValue(undefined as never);

    const result = await mergeFromSyncCsv({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.deleted).toBe(1);
    expect(removePosterFile).toHaveBeenCalledWith("posters/x.jpg");
  });
});
