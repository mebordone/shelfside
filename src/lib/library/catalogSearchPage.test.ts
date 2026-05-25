import { describe, expect, it, vi } from "vitest";
import { applyPageFromCache, commitSearchPage, fetchOlSearchPage } from "./catalogSearchPage";
import * as api from "$lib/api";
import * as searchPagination from "./searchPagination";
import type { SearchHitRow } from "$lib/stores/searchSession.svelte";

const row = { kind: "tmdb" as const, mediaType: "movie" as const, id: 1, title: "A", overview: null, posterPath: null, yearLabel: null, thumb: null };

describe("catalogSearchPage cache helpers", () => {
  it("applyPageFromCache devuelve filas o null", () => {
    expect(applyPageFromCache({}, 0)).toBeNull();
    expect(applyPageFromCache({ 0: [row] }, 0)).toEqual([row]);
  });

  it("commitSearchPage guarda página sin mutar el original", () => {
    const cache: Record<number, SearchHitRow[]> = {};
    const next = commitSearchPage(cache, 1, [row]);
    expect(cache[1]).toBeUndefined();
    expect(next[1]).toEqual([row]);
  });
});

describe("fetchOlSearchPage", () => {
  it("calcula totalPages desde numFound y pageSize", async () => {
    vi.spyOn(searchPagination, "getPageSizeForSource").mockReturnValue(10);
    vi.spyOn(api, "createOpenLibraryClient").mockReturnValue({
      searchBooks: vi.fn().mockResolvedValue({
        hits: [],
        numFound: 25,
        pageSize: 10,
      }),
    } as never);

    const { meta } = await fetchOlSearchPage("dune", 0);
    expect(meta.total).toBe(25);
    expect(meta.totalPages).toBe(3);
    expect(meta.pageSize).toBe(10);
  });
});
