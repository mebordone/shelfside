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

vi.mock("$lib/poster", () => ({
  removePosterFile: vi.fn().mockResolvedValue(undefined),
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

  it("actualiza progress y owned desde el .md", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
shelfside_id: 42
updated_at: "2026-06-01T00:00:00.000Z"
title: "Dune"
media_type: movie
source: tmdb
external_id: "1"
status: in_progress
score: 9
current_season: null
last_episode_watched: null
progress_current: 50
progress_total: 200
owned: 1
started_at: null
completed_at: null
image_url: null
catalog_updated_at: null
---
`);
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue({
      id: 42,
      catalog_item_id: 10,
      status: "in_progress",
      score: 9,
      current_season: null,
      last_episode_watched: null,
      progress_current: 10,
      progress_total: 200,
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
      poster_local_path: null,
      metadata_json: null,
    });
    const execute = vi.fn().mockResolvedValue({});

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute } as never, "/sync");
    expect(result.updated).toBe(1);
    const libUpdate = execute.mock.calls.find((c) => String(c[0]).includes("UPDATE library_entry"));
    expect(libUpdate?.[1]).toEqual(
      expect.arrayContaining([50, 200, 1]),
    );
  });

  it("actualiza por catálogo si shelfside_id del .md difiere del id local", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
shelfside_id: 65
updated_at: "2026-07-01T00:00:00.000Z"
title: "Inception"
media_type: movie
source: tmdb
external_id: "27205"
status: completed
score: 9
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
`);
    const localRow = {
      id: 87,
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
      external_id: "27205",
      title: "Inception",
      image_url: null,
      poster_local_path: null,
      metadata_json: null,
    };
    vi.spyOn(library, "getLibraryEntryById").mockImplementation(async (_db, id) => {
      if (id === 65) return null;
      if (id === 87) return localRow;
      return null;
    });
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue({
      id: 10,
      media_type: "movie",
      source: "tmdb",
      external_id: "27205",
      title: "Inception",
      image_url: null,
      poster_local_path: null,
      season_number: null,
      episode_number: null,
      parent_catalog_id: null,
      metadata_json: null,
      created_at: "",
      updated_at: "",
    });
    vi.spyOn(library, "getLibraryIdForCatalog").mockResolvedValue(87);
    const execute = vi.fn().mockResolvedValue({});

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute } as never, "/sync");
    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
    const libUpdate = execute.mock.calls.find((c) => String(c[0]).includes("UPDATE library_entry"));
    expect(libUpdate?.[1]?.[11]).toBe(87);
  });

  it("actualiza manual por external_id aunque shelfside_id difiera", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
shelfside_id: 100
updated_at: "2026-07-02T00:00:00.000Z"
title: "Cuaderno"
media_type: book
source: manual
external_id: "550e8400-e29b-41d4-a716-446655440000"
status: in_progress
score: null
current_season: null
last_episode_watched: null
progress_current: 30
progress_total: 100
owned: 1
started_at: null
completed_at: null
image_url: null
catalog_updated_at: null
---
Notas sync
`);
    const localRow = {
      id: 200,
      catalog_item_id: 50,
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
      media_type: "book",
      source: "manual",
      external_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Cuaderno",
      image_url: null,
      poster_local_path: null,
      metadata_json: null,
    };
    vi.spyOn(library, "getLibraryEntryById").mockImplementation(async (_db, id) => {
      if (id === 100) return null;
      if (id === 200) return localRow;
      return null;
    });
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue({
      id: 50,
      media_type: "book",
      source: "manual",
      external_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Cuaderno",
      image_url: null,
      poster_local_path: null,
      season_number: null,
      episode_number: null,
      parent_catalog_id: null,
      metadata_json: null,
      created_at: "",
      updated_at: "",
    });
    vi.spyOn(library, "getLibraryIdForCatalog").mockResolvedValue(200);
    const execute = vi.fn().mockResolvedValue({});

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute } as never, "/sync");
    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
  });

  it("aplica tombstone y borra entrada local si deleted_at es más reciente", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
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
# removed from library
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
    const deleteSpy = vi.spyOn(library, "deleteLibraryEntry").mockResolvedValue(undefined);
    const { removePosterFile } = await import("$lib/poster");
    const posterSpy = vi.mocked(removePosterFile);

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.deleted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), 42);
    expect(posterSpy).toHaveBeenCalledWith("posters/x.jpg");
  });

  it("omite tombstone si local es más reciente", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
shelfside_id: 42
deleted: true
deleted_at: "2026-06-01T00:00:00.000Z"
updated_at: "2026-06-01T00:00:00.000Z"
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
      notes: "editada",
      updated_at: "2026-12-01T00:00:00.000Z",
      media_type: "movie",
      source: "tmdb",
      external_id: "1",
      title: "Dune",
      image_url: null,
      poster_local_path: null,
      metadata_json: null,
    });
    const deleteSpy = vi.spyOn(library, "deleteLibraryEntry");

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.deleted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("omite tombstone si ya no hay entrada local", async () => {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    vi.mocked(readTextFile).mockResolvedValueOnce(`---
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
`);
    vi.spyOn(library, "getLibraryEntryById").mockResolvedValue(null);
    vi.spyOn(catalog, "findCatalogBySource").mockResolvedValue(null);

    const result = await mergeFromSyncFolder({ select: vi.fn(), execute: vi.fn() } as never, "/sync");
    expect(result.deleted).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
