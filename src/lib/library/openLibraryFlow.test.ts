import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenLibraryDetail, OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import { downloadPosterToApp } from "$lib/poster";
import { addOpenLibraryHitToLibraryFlow } from "./openLibraryFlow";

vi.mock("$lib/poster", () => ({
  downloadPosterToApp: vi.fn().mockResolvedValue("posters/book_OL1M.jpg"),
  posterRelativePath: vi.fn(() => "posters/book_OL1M.jpg"),
}));

const hit: OpenLibrarySearchHit = {
  editionId: "OL1M",
  workKey: "OL1W",
  title: "Libro",
  authors: ["Autor"],
  year: 2020,
  coverUrl: "https://covers.openlibrary.org/b/id/12345-L.jpg",
};

const detail: OpenLibraryDetail = {
  ...hit,
  overview: "Sinopsis",
  isbn: null,
  languages: ["spa"],
  openLibraryUrl: "https://openlibrary.org/books/OL1M",
  rawJson: JSON.stringify({ edition: {}, work: {} }),
};

describe("addOpenLibraryHitToLibraryFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("añade catálogo y biblioteca", async () => {
    const client = {
      getEditionDetail: vi.fn().mockResolvedValue(detail),
    };
    const execute = vi.fn().mockImplementation(async (q: string) => {
      if (String(q).includes("INSERT INTO catalog_item")) return { lastInsertId: 1, rowsAffected: 1 };
      if (String(q).includes("INSERT INTO library_entry")) return { lastInsertId: 2, rowsAffected: 1 };
      return { rowsAffected: 0 };
    });
    const select = vi.fn().mockResolvedValue([]);
    const db = { execute, select };

    const r = await addOpenLibraryHitToLibraryFlow(db, client as never, hit);

    expect(r.alreadyInLibrary).toBe(false);
    expect(r.libraryId).toBe(2);
    expect(client.getEditionDetail).toHaveBeenCalledWith("OL1M", {
      yearHint: hit.year,
      coverUrlHint: hit.coverUrl,
    });
  });

  it("prioriza coverUrl del hit si el detalle no trae portada usable", async () => {
    const detailSinPortada: OpenLibraryDetail = {
      ...detail,
      coverUrl: "https://covers.openlibrary.org/b/olid/OL1M-L.jpg",
    };
    const client = {
      getEditionDetail: vi.fn().mockResolvedValue(detailSinPortada),
    };
    const execute = vi.fn().mockImplementation(async (q: string) => {
      if (String(q).includes("INSERT INTO catalog_item")) return { lastInsertId: 1, rowsAffected: 1 };
      if (String(q).includes("INSERT INTO library_entry")) return { lastInsertId: 2, rowsAffected: 1 };
      return { rowsAffected: 0 };
    });
    const db = { execute, select: vi.fn().mockResolvedValue([]) };

    await addOpenLibraryHitToLibraryFlow(db, client as never, hit);

    const catalogInsert = execute.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO catalog_item"),
    );
    expect(catalogInsert?.[1]?.[4]).toBe(hit.coverUrl);
    expect(vi.mocked(downloadPosterToApp)).toHaveBeenCalledWith(
      hit.coverUrl,
      "posters/book_OL1M.jpg",
    );
  });

  it("no guarda ni descarga portada si solo hay URL /b/olid/", async () => {
    const hitSinPortada: OpenLibrarySearchHit = { ...hit, coverUrl: null };
    const detailOlid: OpenLibraryDetail = {
      ...detail,
      coverUrl: "https://covers.openlibrary.org/b/olid/OL1M-L.jpg",
    };
    const client = { getEditionDetail: vi.fn().mockResolvedValue(detailOlid) };
    const execute = vi.fn().mockImplementation(async (q: string) => {
      if (String(q).includes("INSERT INTO catalog_item")) return { lastInsertId: 1, rowsAffected: 1 };
      if (String(q).includes("INSERT INTO library_entry")) return { lastInsertId: 2, rowsAffected: 1 };
      return { rowsAffected: 0 };
    });
    const db = { execute, select: vi.fn().mockResolvedValue([]) };

    await addOpenLibraryHitToLibraryFlow(db, client as never, hitSinPortada);

    const catalogInsert = execute.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO catalog_item"),
    );
    expect(catalogInsert?.[1]?.[4]).toBeNull();
    expect(downloadPosterToApp).not.toHaveBeenCalled();
  });
});
