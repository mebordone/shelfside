import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appLocale } from "$lib/i18n/locale.svelte";
import { persistOlStrictLanguage } from "$lib/stores/catalogPrefs";
import { createOpenLibraryClient } from "./client";
import { OpenLibraryHttpError } from "./errors";

describe("createOpenLibraryClient", () => {
  beforeEach(() => {
    localStorage.clear();
    appLocale.current = "es";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searchBooks mapea edición con título, autor y año", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        docs: [
          {
            key: "/works/OL27448W",
            title: "The Lord of the Rings",
            author_name: ["J. R. R. Tolkien"],
            first_publish_year: 1954,
            cover_i: 258027,
            editions: {
              docs: [{ key: "/books/OL7170815M", title: "LOTR", publish_year: 1954, cover_i: 258027 }],
            },
          },
          {
            key: "/works/OL2W",
            title: "Sin autor",
            first_publish_year: 2000,
            editions: { docs: [{ key: "/books/OL2M", publish_year: 2000 }] },
          },
        ],
        numFound: 42,
      }),
    });

    const client = createOpenLibraryClient({ fetchImpl, lang: "es" });
    const page = await client.searchBooks("tolkien");

    expect(page.hits).toHaveLength(1);
    expect(page.numFound).toBe(42);
    expect(page.page).toBe(0);
    expect(page.pageSize).toBe(10);
    expect(page.hits[0]?.editionId).toBe("OL7170815M");
    expect(page.hits[0]?.workKey).toBe("OL27448W");
    expect(page.hits[0]?.authors[0]).toContain("Tolkien");
    expect(page.hits[0]?.year).toBe(1954);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("lang=es"));
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("limit=10"));
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("offset=0"));
  });

  it("searchBooks añade language:spa si filtro estricto en español", async () => {
    persistOlStrictLanguage(true);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ docs: [], numFound: 0 }),
    });
    const client = createOpenLibraryClient({ fetchImpl, lang: "es" });
    await client.searchBooks("fundacion");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/q=fundacion\+language%3Aspa|q=.*language%3Aspa/),
    );
  });

  it("searchBooks respeta offset para paginación", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ docs: [], numFound: 100 }),
    });
    const client = createOpenLibraryClient({ fetchImpl });
    const page = await client.searchBooks("asimov", { offset: 20, limit: 10 });

    expect(page.page).toBe(2);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("offset=20"));
  });

  it("getEditionDetail combina edición y obra", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/books/OL1M.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            title: "Libro edición",
            publish_year: 2020,
            works: [{ key: "/works/OL1W" }],
            isbn_13: ["9781234567890"],
            languages: [{ key: "/languages/spa" }],
          }),
        };
      }
      if (url.includes("/works/OL1W.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            title: "Obra",
            description: "Sinopsis larga",
            subjects: ["Fantasy fiction"],
            authors: [{ author: { key: "/authors/OL26320A" } }],
            first_publish_year: 2020,
          }),
        };
      }
      if (url.includes("/authors/OL26320A")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ name: "Autor Uno" }),
        };
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const client = createOpenLibraryClient({ fetchImpl });
    const d = await client.getEditionDetail("OL1M");

    expect(d.title).toBe("Libro edición");
    expect(d.authors).toEqual(["Autor Uno"]);
    expect(d.year).toBe(2020);
    expect(d.overview).toBe("Sinopsis larga");
    expect(d.isbn).toBe("9781234567890");
    expect(d.languages).toContain("spa");
    expect(d.openLibraryUrl).toContain("/books/OL1M");
  });

  it("401/404 produce OpenLibraryHttpError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const client = createOpenLibraryClient({ fetchImpl });
    await expect(client.searchBooks("x")).rejects.toBeInstanceOf(OpenLibraryHttpError);
  });

  it("getRelatedEditionHits usa series+autor+par en paralelo, sin /subjects ni N×works", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      if (url.includes("/books/OL26242482M.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            title: "Dune",
            publish_year: 1965,
            works: [{ key: "/works/OL893415W" }],
          }),
        };
      }
      if (url.includes("/works/OL893415W.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            title: "Dune",
            first_publish_year: 1965,
            subjects: [
              "Dune (Imaginary place)",
              "Fiction",
              "Science fiction",
              "Ecology",
              "nyt:foo=1",
            ],
            authors: [{ author: { key: "/authors/OL79034A" } }],
            series: [{ series: { key: "/series/OL331367L" }, position: "1" }],
          }),
        };
      }
      if (url.includes("/search.json")) {
        const isSeries = url.includes("series_key");
        const isAuthor = url.includes("author_key");
        const isPair =
          (url.includes("science_fiction") && url.includes("ecology")) ||
          (url.includes("subject_key") && url.includes("AND"));
        const docs: Record<string, unknown>[] = [];
        if (isSeries || isAuthor) {
          docs.push({
            key: "/works/OL893526W",
            title: "Dune Messiah",
            author_name: ["Frank Herbert"],
            author_key: ["OL79034A"],
            first_publish_year: 1969,
            cover_i: 1,
            subject: ["Science fiction"],
            editions: {
              docs: [{ key: "/books/OL7525229M", title: "Dune Messiah", publish_year: 1969, cover_i: 1 }],
            },
          });
        }
        if (isPair || (url.includes("subject_key") && !isSeries && !isAuthor)) {
          docs.push({
            key: "/works/OL1811933W",
            title: "Ecotopia",
            author_name: ["Ernest Callenbach"],
            author_key: ["OL217346A"],
            first_publish_year: 1975,
            cover_i: 2,
            subject: ["Science fiction", "Ecology"],
            editions: { docs: [{ key: "/books/OL24945948M", publish_year: 1975, cover_i: 2 }] },
          });
        }
        return { ok: true, status: 200, json: async () => ({ docs }) };
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const client = createOpenLibraryClient({ fetchImpl, lang: "es" });
    const hits = await client.getRelatedEditionHits("OL26242482M");

    const searchUrls = urls.filter((u) => u.includes("/search.json"));
    expect(searchUrls.length).toBeLessThanOrEqual(6);
    expect(urls.some((u) => u.includes("/subjects/"))).toBe(false);
    expect(urls.some((u) => /key[=:]\/works\//.test(decodeURIComponent(u)))).toBe(false);
    expect(searchUrls.some((u) => u.includes("series_key"))).toBe(true);
    expect(searchUrls.some((u) => u.includes("author_key"))).toBe(true);
    expect(
      searchUrls.some((u) => decodeURIComponent(u).includes("science_fiction") && decodeURIComponent(u).includes("ecology")),
    ).toBe(true);
    expect(searchUrls.length).toBeLessThanOrEqual(4);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.title === "Dune Messiah")).toBe(true);
  });
});
