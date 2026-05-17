import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenLibraryDetail, OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
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
  coverUrl: "https://covers.openlibrary.org/b/olid/OL1M-L.jpg",
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
    expect(client.getEditionDetail).toHaveBeenCalledWith("OL1M");
  });
});
