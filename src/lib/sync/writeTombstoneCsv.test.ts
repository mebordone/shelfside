import { describe, expect, it, vi } from "vitest";
import { writeTombstoneToSyncCsv } from "./writeTombstoneCsv";
import { serializeSyncCsv, type SyncCsvRow } from "./parseCsv";

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("writeTombstoneToSyncCsv", () => {
  it("upsert tombstone en shelfside.csv", async () => {
    const { readTextFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const existing: SyncCsvRow = {
      shelfside_id: 7,
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted: false,
      deleted_at: null,
      title: "My Book",
      media_type: "book",
      source: "manual",
      external_id: "uuid-1",
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
      notes: "keep",
    };
    vi.mocked(readTextFile).mockResolvedValue(serializeSyncCsv([existing]));

    await writeTombstoneToSyncCsv(
      "/sync",
      {
        id: 7,
        catalog_item_id: 1,
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
        media_type: "book",
        source: "manual",
        external_id: "uuid-1",
        title: "My Book",
        image_url: null,
        poster_local_path: null,
        metadata_json: null,
      },
      "2026-05-25T12:00:00.000Z",
    );

    expect(writeTextFile).toHaveBeenCalledTimes(1);
    const [path, content] = vi.mocked(writeTextFile).mock.calls[0];
    expect(path).toBe("/sync/shelfside.csv");
    expect(content).toContain("true");
    expect(content).toContain("2026-05-25T12:00:00.000Z");
    expect(content).not.toContain("keep");
  });
});
