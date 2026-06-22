import { describe, expect, it, vi } from "vitest";
import { writeTombstoneToSyncFolder } from "./writeTombstone";

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("writeTombstoneToSyncFolder", () => {
  it("escribe .md con deleted true en library/", async () => {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTombstoneToSyncFolder(
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
    expect(path).toBe("/sync/library/my-book-7.md");
    expect(content).toContain("deleted: true");
    expect(content).toContain("deleted_at: \"2026-05-25T12:00:00.000Z\"");
  });
});
