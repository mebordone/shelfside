import { describe, expect, it } from "vitest";
import { applyPageFromCache, commitSearchPage } from "./catalogSearchPage";
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
