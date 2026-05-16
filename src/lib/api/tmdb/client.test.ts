import { afterEach, describe, expect, it, vi } from "vitest";
import { createTmdbClient } from "./client";
import { TmdbConfigError } from "./errors";

describe("createTmdbClient", () => {
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
    const hits = await client.searchMulti("x");

    expect(hits).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("api_key=k"),
      expect.anything(),
    );
    expect(hits[0]?.mediaType).toBe("movie");
    expect(hits[0]?.yearLabel).toBe("2020");
    expect(hits[1]?.mediaType).toBe("tv");
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
      "https://api.themoviedb.org/3/search/multi?query=matrix",
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
});
