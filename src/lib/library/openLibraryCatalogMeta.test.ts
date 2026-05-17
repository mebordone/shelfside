import { describe, expect, it } from "vitest";
import { bookCatalogFromMetadata, buildManualBookMetadata } from "./openLibraryCatalogMeta";

describe("bookCatalogFromMetadata", () => {
  it("parsea formato manual compacto", () => {
    const m = bookCatalogFromMetadata(JSON.stringify({ authors: ["Autor"], year: 1999 }));
    expect(m?.authors).toEqual(["Autor"]);
    expect(m?.year).toBe(1999);
  });

  it("parsea formato con edition/work", () => {
    const m = bookCatalogFromMetadata(
      JSON.stringify({
        authors: ["A"],
        year: 2020,
        editionId: "OL1M",
        edition: { publish_year: 2020, isbn_13: ["9780"] },
        work: { description: "Sinopsis" },
      }),
    );
    expect(m?.overview).toBe("Sinopsis");
    expect(m?.isbn).toBe("9780");
    expect(m?.openLibraryUrl).toContain("OL1M");
  });
});

describe("buildManualBookMetadata", () => {
  it("devuelve null si no hay datos", () => {
    expect(buildManualBookMetadata({})).toBeNull();
  });
});
