import { describe, expect, it } from "vitest";
import type { TmdbSearchHit } from "$lib/api/tmdb/client";
import { mergeRelatedTmdbHits, RELATED_TMDB_HITS_CAP } from "./tmdbRelatedHits";

function hit(id: number, media: "movie" | "tv"): TmdbSearchHit {
  return {
    mediaType: media,
    id,
    title: `T${id}`,
    overview: null,
    posterPath: null,
    yearLabel: null,
  };
}

describe("mergeRelatedTmdbHits", () => {
  it("deduplica y respeta orden recomendaciones antes que similar", () => {
    const a = hit(1, "movie");
    const b = hit(2, "movie");
    const merged = mergeRelatedTmdbHits(
      [
        [a, b],
        [hit(2, "movie"), hit(3, "movie")],
      ],
      { cap: RELATED_TMDB_HITS_CAP },
    );
    expect(merged.map((h) => h.id)).toEqual([1, 2, 3]);
  });

  it("excluye el id actual y capa", () => {
    const merged = mergeRelatedTmdbHits(
      [
        [hit(1, "tv"), hit(2, "tv"), hit(5, "tv")],
        [hit(5, "tv"), hit(9, "tv")],
      ],
      { cap: 2, excludeMediaType: "tv", excludeId: 1 },
    );
    expect(merged.map((h) => h.id)).toEqual([2, 5]);
  });
});
