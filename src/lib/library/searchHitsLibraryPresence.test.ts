import { describe, expect, it, vi } from "vitest";
import {
  getSearchHitsLibraryPresence,
  searchHitKey,
} from "./searchHitsLibraryPresence";
import type { SearchHitRow } from "$lib/stores/searchSession.svelte";

vi.mock("$lib/db/library", () => ({
  getTmdbHitsLibraryPresence: vi.fn(),
  getOpenLibraryHitsLibraryPresence: vi.fn(),
}));

describe("searchHitKey", () => {
  it("distingue TMDB y OL", () => {
    expect(
      searchHitKey({
        kind: "tmdb",
        mediaType: "movie",
        id: 11,
        title: "Dune",
        overview: null,
        posterPath: null,
        yearLabel: "2021",
        thumb: null,
      }),
    ).toBe("tmdb-movie-11");
    expect(
      searchHitKey({
        kind: "openlibrary",
        editionId: "OL1M",
        workKey: "OL1W",
        title: "Dune",
        authors: ["Herbert"],
        year: 1965,
        coverUrl: null,
        thumb: null,
      }),
    ).toBe("ol-OL1M");
  });
});

describe("getSearchHitsLibraryPresence", () => {
  it("mapea presence TMDB y OL a hitKey", async () => {
    const { getTmdbHitsLibraryPresence, getOpenLibraryHitsLibraryPresence } =
      await import("$lib/db/library");
    vi.mocked(getTmdbHitsLibraryPresence).mockResolvedValue(
      new Map([
        ["movie-11", 42],
        ["tv-7", null],
      ]),
    );
    vi.mocked(getOpenLibraryHitsLibraryPresence).mockResolvedValue(new Map([["OL1M", 99]]));

    const hits: SearchHitRow[] = [
      {
        kind: "tmdb",
        mediaType: "movie",
        id: 11,
        title: "Dune",
        overview: null,
        posterPath: null,
        yearLabel: "2021",
        thumb: null,
      },
      {
        kind: "tmdb",
        mediaType: "tv",
        id: 7,
        title: "Show",
        overview: null,
        posterPath: null,
        yearLabel: null,
        thumb: null,
      },
      {
        kind: "openlibrary",
        editionId: "OL1M",
        workKey: "OL1W",
        title: "Book",
        authors: [],
        year: 0,
        coverUrl: null,
        thumb: null,
      },
    ];

    const map = await getSearchHitsLibraryPresence({} as never, hits);
    expect(map.get("tmdb-movie-11")).toBe(42);
    expect(map.get("tmdb-tv-7")).toBeNull();
    expect(map.get("ol-OL1M")).toBe(99);
    expect(getTmdbHitsLibraryPresence).toHaveBeenCalledOnce();
    expect(getOpenLibraryHitsLibraryPresence).toHaveBeenCalledOnce();
  });

  it("lista vacía no consulta DB", async () => {
    const { getTmdbHitsLibraryPresence, getOpenLibraryHitsLibraryPresence } =
      await import("$lib/db/library");
    vi.mocked(getTmdbHitsLibraryPresence).mockClear();
    vi.mocked(getOpenLibraryHitsLibraryPresence).mockClear();
    const map = await getSearchHitsLibraryPresence({} as never, []);
    expect(map.size).toBe(0);
    expect(getTmdbHitsLibraryPresence).not.toHaveBeenCalled();
    expect(getOpenLibraryHitsLibraryPresence).not.toHaveBeenCalled();
  });
});
