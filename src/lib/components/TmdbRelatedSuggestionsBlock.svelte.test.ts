import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import TmdbRelatedSuggestionsBlock from "./TmdbRelatedSuggestionsBlock.svelte";

const hoisted = vi.hoisted(() => ({
  getMovieRecommendations: vi.fn().mockResolvedValue([]),
  getMovieSimilar: vi.fn().mockResolvedValue([]),
  getTvRecommendations: vi.fn().mockResolvedValue([]),
  getTvSimilar: vi.fn().mockResolvedValue([]),
}));

vi.mock("$lib/api", () => ({
  getTmdbApiKeyFromEnv: vi.fn(() => "test-key"),
  createTmdbClient: vi.fn(() => ({
    getMovieRecommendations: hoisted.getMovieRecommendations,
    getMovieSimilar: hoisted.getMovieSimilar,
    getTvRecommendations: hoisted.getTvRecommendations,
    getTvSimilar: hoisted.getTvSimilar,
    posterUrlFromPath: () => null,
  })),
}));

vi.mock("$lib/db/connection", () => ({
  getDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("$lib/db", () => ({
  getTmdbHitsLibraryPresence: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("$lib/library/tmdbFlow", () => ({
  addTmdbHitToLibraryFlow: vi.fn(),
}));

vi.mock("$lib/poster", () => ({
  resolvePosterDisplayUrl: vi.fn().mockResolvedValue(null),
}));

afterEach(() => {
  cleanup();
});

describe("TmdbRelatedSuggestionsBlock", () => {
  it("sin clave API muestra vacío sin llamar a TMDB", async () => {
    const { getTmdbApiKeyFromEnv, createTmdbClient } = await import("$lib/api");
    vi.mocked(getTmdbApiKeyFromEnv).mockReturnValueOnce("");
    render(TmdbRelatedSuggestionsBlock, { props: { mediaType: "movie", tmdbId: 99 } });
    expect(screen.getByRole("region", { name: /Sugerencias TMDB/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Sin sugerencias por ahora/i)).toBeInTheDocument();
    });
    expect(createTmdbClient).not.toHaveBeenCalled();
  });

  it("con clave API consulta recomendaciones/similares de película", async () => {
    const { getTmdbApiKeyFromEnv, createTmdbClient } = await import("$lib/api");
    vi.mocked(getTmdbApiKeyFromEnv).mockReturnValue("test-key");
    hoisted.getMovieRecommendations.mockClear();
    hoisted.getMovieSimilar.mockClear();
    render(TmdbRelatedSuggestionsBlock, { props: { mediaType: "movie", tmdbId: 11 } });
    await waitFor(() => {
      expect(hoisted.getMovieRecommendations).toHaveBeenCalledWith(11);
      expect(hoisted.getMovieSimilar).toHaveBeenCalledWith(11);
    });
    expect(createTmdbClient).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Sin sugerencias por ahora/i)).toBeInTheDocument();
    });
  });

  it("serie TV usa endpoints de TV", async () => {
    vi.mocked((await import("$lib/api")).getTmdbApiKeyFromEnv).mockReturnValue("test-key");
    hoisted.getTvRecommendations.mockClear();
    hoisted.getTvSimilar.mockClear();
    render(TmdbRelatedSuggestionsBlock, { props: { mediaType: "tv", tmdbId: 42 } });
    await waitFor(() => {
      expect(hoisted.getTvRecommendations).toHaveBeenCalledWith(42);
      expect(hoisted.getTvSimilar).toHaveBeenCalledWith(42);
    });
  });
});
