import { describe, expect, it, vi } from "vitest";
import * as library from "$lib/db/library";
import { buildLibraryCsv } from "./csv";

describe("buildLibraryCsv", () => {
  it("genera header y escapa campos con comas", async () => {
    vi.spyOn(library, "listLibraryWithCatalog").mockResolvedValue([
      {
        id: 1,
        catalog_item_id: 10,
        title: 'Título "X"',
        media_type: "movie",
        source: "tmdb",
        external_id: "99",
        status: "in_progress",
        score: 8,
        current_season: null,
        last_episode_watched: null,
        started_at: null,
        completed_at: null,
        notes: "a, b",
        image_url: null,
        updated_at: "2026-02-01T00:00:00.000Z",
        poster_local_path: null,
        metadata_json: null,
        progress_current: 120,
        progress_total: 400,
        owned: 1,
      },
    ]);

    const db = {
      select: vi.fn().mockResolvedValue([{ id: 10, updated_at: "2026-01-01" }]),
    };

    const csv = await buildLibraryCsv(db as never);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "shelfside_id,title,media_type,source,external_id,status,score,current_season,last_episode_watched,progress_current,progress_total,owned,started_at,completed_at,notes,image_url,catalog_updated_at,library_updated_at",
    );
    expect(lines[1]).toContain('"Título ""X"""');
    expect(lines[1]).toContain('"a, b"');
    expect(lines[1]).toContain(",120,400,1,");
  });
});
