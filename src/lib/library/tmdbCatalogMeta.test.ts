import { describe, expect, it } from "vitest";
import { tmdbTvCatalogFromMetadata } from "./tmdbCatalogMeta";

describe("tmdbTvCatalogFromMetadata", () => {
  it("devuelve null con JSON vacío o inválido", () => {
    expect(tmdbTvCatalogFromMetadata(null)).toBeNull();
    expect(tmdbTvCatalogFromMetadata("")).toBeNull();
    expect(tmdbTvCatalogFromMetadata("{")).toBeNull();
    expect(tmdbTvCatalogFromMetadata("[]")).toBeNull();
  });

  it("lee number_of_seasons, number_of_episodes y status", () => {
    const json = JSON.stringify({
      id: 1,
      number_of_seasons: 2,
      number_of_episodes: 12,
      status: "Ended",
    });
    expect(tmdbTvCatalogFromMetadata(json)).toEqual({
      numberOfSeasons: 2,
      numberOfEpisodes: 12,
      showStatus: "Ended",
    });
  });

  it("trunca temporadas/episodios si vienen decimales", () => {
    const json = JSON.stringify({ number_of_seasons: 3.7, number_of_episodes: 10.2 });
    expect(tmdbTvCatalogFromMetadata(json)).toEqual({
      numberOfSeasons: 3,
      numberOfEpisodes: 10,
      showStatus: null,
    });
  });
});
