import { describe, expect, it, vi } from "vitest";
import * as catalog from "$lib/db/catalog";
import * as library from "$lib/db/library";
import { mergeFromSyncFolder } from "./mergeFromFolder";

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn().mockResolvedValue([{ name: "dune-42.md" }]),
  readTextFile: vi.fn().mockResolvedValue(`---
shelfside_id: 42
updated_at: "2026-06-01T00:00:00.000Z"
title: "Dune"
media_type: movie
source: tmdb
external_id: "1"
status: planning
score: null
current_season: null
last_episode_watched: null
started_at: null
completed_at: null
image_url: null
catalog_updated_at: null
---
`),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

describe("mergeFromSyncFolder", () => {
  it("importa entrada nueva", async () => {
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue(null);
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue(null);
    vi.spyOn(catalog, "insertCatalogItem").mockResolvedValue(10);
    const execute = vi.fn().mockResolvedValue({});
    const db = { select: vi.fn(), execute };

    const result = await mergeFromSyncFolder(db as never, "/sync");
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(execute).toHaveBeenCalled();
  });

  it("omite si local es más reciente y el contenido coincide", async () => {
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

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it("actualiza si las notas cambiaron con el mismo updated_at", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
shelfside_id: 42
updated_at: "2026-06-01T00:00:00.000Z"
title: "Dune"
media_type: movie
source: tmdb
external_id: "1"
status: planning
score: null
current_season: null
last_episode_watched: null
started_at: null
completed_at: null
image_url: null
catalog_updated_at: null
---
Nota editada en el archivo sync
`);
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
      notes: "Nota original",
      updated_at: "2026-06-01T00:00:00.000Z",
      media_type: "movie",
      source: "tmdb",
      external_id: "1",
      title: "Dune",
      image_url: null,
      poster_local_path: null,
      metadata_json: null,
    });
    const execute = vi.fn().mockResolvedValue({});

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute } as never, "/sync");
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(execute).toHaveBeenCalled();
  });
});
