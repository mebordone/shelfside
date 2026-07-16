import { describe, expect, it, vi } from "vitest";
import { deleteLibraryEntryWithAssets } from "./deleteEntryFlow";

vi.mock("$lib/db", async (importOriginal) => {
  const orig = await importOriginal<typeof import("$lib/db")>();
  return {
    ...orig,
    getLibraryEntryById: vi.fn(),
    deleteLibraryEntry: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("$lib/poster", () => ({
  removePosterFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/sync/writeTombstoneCsv", () => ({
  writeTombstoneToSyncCsv: vi.fn().mockResolvedValue(undefined),
}));

describe("deleteLibraryEntryWithAssets", () => {
  it("borra SQL y elimina poster local", async () => {
    const { getLibraryEntryById, deleteLibraryEntry } = await import("$lib/db");
    const { removePosterFile } = await import("$lib/poster");
    vi.mocked(getLibraryEntryById).mockResolvedValueOnce({
      id: 5,
      catalog_item_id: 9,
      poster_local_path: "posters/book_OL1M.jpg",
    } as never);

    const db = {} as never;
    await deleteLibraryEntryWithAssets(db, 5);

    expect(deleteLibraryEntry).toHaveBeenCalledWith(db, 5);
    expect(removePosterFile).toHaveBeenCalledWith("posters/book_OL1M.jpg");
  });

  it("escribe tombstone CSV si hay carpeta sync", async () => {
    const { getLibraryEntryById, deleteLibraryEntry } = await import("$lib/db");
    const { writeTombstoneToSyncCsv } = await import("$lib/sync/writeTombstoneCsv");
    const row = {
      id: 5,
      catalog_item_id: 9,
      poster_local_path: null,
      title: "Test",
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
      notes: null,
      updated_at: "2026-01-01T00:00:00.000Z",
      image_url: null,
      metadata_json: null,
    };
    vi.mocked(getLibraryEntryById).mockResolvedValueOnce(row as never);

    const db = {} as never;
    await deleteLibraryEntryWithAssets(db, 5, { syncDir: "/sync" });

    expect(writeTombstoneToSyncCsv).toHaveBeenCalledWith("/sync", row);
    expect(deleteLibraryEntry).toHaveBeenCalledWith(db, 5);
  });
});
