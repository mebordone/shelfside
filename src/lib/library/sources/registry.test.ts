import { describe, expect, it, vi } from "vitest";
import { addSearchHitToLibrary, getCatalogSourceAdapter, isCatalogSourceId } from "./registry";

vi.mock("$lib/library/tmdbFlow", () => ({
  addTmdbHitToLibraryFlow: vi.fn().mockResolvedValue({ catalogId: 1, libraryId: 2, alreadyInLibrary: false }),
  refreshTmdbCatalogFlow: vi.fn(),
}));

vi.mock("$lib/library/openLibraryFlow", () => ({
  addOpenLibraryHitToLibraryFlow: vi
    .fn()
    .mockResolvedValue({ catalogId: 3, libraryId: 4, alreadyInLibrary: false }),
  refreshOpenLibraryCatalogFlow: vi.fn(),
}));

vi.mock("$lib/api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("$lib/api")>();
  return {
    ...orig,
    createTmdbClient: vi.fn(() => ({})),
    createOpenLibraryClient: vi.fn(() => ({})),
    getTmdbApiKeyFromEnv: vi.fn(() => "key"),
  };
});

describe("catalog source registry", () => {
  it("isCatalogSourceId", () => {
    expect(isCatalogSourceId("tmdb")).toBe(true);
    expect(isCatalogSourceId("openlibrary")).toBe(true);
    expect(isCatalogSourceId("manual")).toBe(false);
  });

  it("getCatalogSourceAdapter lanza para fuente desconocida", () => {
    expect(() => getCatalogSourceAdapter("mal")).toThrow("no soportada");
  });

  it("addSearchHitToLibrary delega a tmdb", async () => {
    const { addTmdbHitToLibraryFlow } = await import("$lib/library/tmdbFlow");
    const hit = {
      kind: "tmdb" as const,
      mediaType: "movie" as const,
      id: 1,
      title: "X",
      overview: null,
      yearLabel: "2020",
      posterPath: "/p.jpg",
      thumb: null,
    };
    const r = await addSearchHitToLibrary({} as never, hit, "planning");
    expect(r.libraryId).toBe(2);
    expect(addTmdbHitToLibraryFlow).toHaveBeenCalled();
  });

  it("addSearchHitToLibrary delega a openlibrary", async () => {
    const { addOpenLibraryHitToLibraryFlow } = await import("$lib/library/openLibraryFlow");
    const hit = {
      kind: "openlibrary" as const,
      editionId: "OL1M",
      workKey: "OL1W",
      title: "Libro",
      authors: ["A"],
      year: 2020,
      coverUrl: null,
      thumb: null,
    };
    const r = await addSearchHitToLibrary({} as never, hit);
    expect(r.libraryId).toBe(4);
    expect(addOpenLibraryHitToLibraryFlow).toHaveBeenCalled();
  });
});
