import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appLocale } from "$lib/i18n/locale.svelte";
import { persistCatalogLang } from "$lib/stores/catalogPrefs";
import { createTmdbClient } from "./client";
import { TmdbConfigError } from "./errors";

describe("createTmdbClient", () => {
  beforeEach(() => {
    localStorage.clear();
    appLocale.current = "es";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lanza TmdbConfigError sin clave", () => {
    expect(() => createTmdbClient({ apiKey: "" })).toThrow(TmdbConfigError);
  });

  it("searchMulti mapea películas y series", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          results: [
            {
              media_type: "movie",
              id: 1,
              title: "A",
              overview: "o",
              poster_path: "/p.jpg",
              release_date: "2020-01-01",
            },
            {
              media_type: "tv",
              id: 2,
              name: "Show",
              overview: null,
              poster_path: null,
              first_air_date: "2019-05-05",
            },
            { media_type: "person", id: 3, name: "Actor" },
          ],
        }),
    });

    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    const page = await client.searchMulti("x");

    expect(page.hits).toHaveLength(2);
    expect(page.page).toBe(0);
    expect(page.pageSize).toBe(20);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("api_key=k"),
      expect.anything(),
    );
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("page=1"), expect.anything());
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/language=es-ES/),
      expect.anything(),
    );
    expect(page.hits[0]?.mediaType).toBe("movie");
    expect(page.hits[0]?.yearLabel).toBe("2020");
    expect(page.hits[1]?.mediaType).toBe("tv");
  });

  it("searchMulti respeta page y total_pages", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          page: 2,
          total_results: 100,
          total_pages: 5,
          results: [],
        }),
    });
    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    const page = await client.searchMulti("matrix", { page: 1 });

    expect(page.page).toBe(1);
    expect(page.totalResults).toBe(100);
    expect(page.totalPages).toBe(5);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.anything(),
    );
  });

  it("usa language=en-US cuando catálogo en inglés", async () => {
    persistCatalogLang("en");
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ results: [] }),
    });
    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    await client.searchMulti("matrix");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/language=en-US.*region=US/),
      expect.anything(),
    );
  });

  it("con JWT (eyJ...) usa Bearer y no api_key en la URL", async () => {
    const jwt = "eyJhbGci.test.signature";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ results: [] }),
    });
    const client = createTmdbClient({ apiKey: jwt, fetchImpl });
    await client.searchMulti("matrix");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/api\.themoviedb\.org\/3\/search\/multi\?query=matrix&page=1&language=es-ES&region=ES$/,
      ),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${jwt}` },
      }),
    );
  });

  it("401 produce TmdbHttpError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => "{}",
    });
    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    await expect(client.searchMulti("q")).rejects.toMatchObject({ status: 401 });
  });

  it("429 reintenta una vez", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => "0" },
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ results: [] }),
      });

    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    const p = client.searchMulti("q");
    await vi.runAllTimersAsync();
    await p;

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("getMovieRecommendations mapea resultados de película", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          results: [
            {
              id: 10,
              title: "Rel",
              overview: "x",
              poster_path: "/p.jpg",
              release_date: "2021-06-01",
            },
          ],
        }),
    });
    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    const hits = await client.getMovieRecommendations(99);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/movie/99/recommendations"),
      expect.anything(),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      mediaType: "movie",
      id: 10,
      title: "Rel",
      yearLabel: "2021",
    });
  });

  it("getTvSimilar mapea resultados de TV", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          results: [
            {
              id: 20,
              name: "Show",
              overview: null,
              poster_path: null,
              first_air_date: "2018-01-15",
            },
          ],
        }),
    });
    const client = createTmdbClient({ apiKey: "k", fetchImpl });
    const hits = await client.getTvSimilar(5);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/tv/5/similar"), expect.anything());
    expect(hits[0]?.mediaType).toBe("tv");
    expect(hits[0]?.title).toBe("Show");
    expect(hits[0]?.yearLabel).toBe("2018");
  });
});
