import { describe, expect, it } from "vitest";
import { mapSearchDocToHit, resolveSearchDisplayTitle } from "./parse";

describe("resolveSearchDisplayTitle", () => {
  it("prefiere título de edición y conserva obra como workTitle", () => {
    expect(resolveSearchDisplayTitle("Foundation", "Fundación")).toEqual({
      title: "Fundación",
      workTitle: "Foundation",
    });
  });

  it("sin edición distinta usa solo obra", () => {
    expect(resolveSearchDisplayTitle("Dune", "Dune")).toEqual({ title: "Dune" });
  });
});

describe("mapSearchDocToHit", () => {
  it("mapea Fundación con subtítulo Foundation", () => {
    const hit = mapSearchDocToHit({
      key: "/works/OL123W",
      title: "Foundation",
      author_name: ["Isaac Asimov"],
      first_publish_year: 1951,
      editions: {
        docs: [{ key: "/books/OL456M", title: "Fundación", publish_year: 1951 }],
      },
    });
    expect(hit?.title).toBe("Fundación");
    expect(hit?.workTitle).toBe("Foundation");
  });

  it("usa cover_i y no inventa URL por OLID", () => {
    const hit = mapSearchDocToHit({
      key: "/works/OL123W",
      title: "Foundation",
      author_name: ["Isaac Asimov"],
      first_publish_year: 1951,
      cover_i: 999,
      editions: {
        docs: [{ key: "/books/OL456M", title: "Fundación", publish_year: 1951 }],
      },
    });
    expect(hit?.coverUrl).toBe("https://covers.openlibrary.org/b/id/999-L.jpg");
  });

  it("sin cover_i no devuelve portada", () => {
    const hit = mapSearchDocToHit({
      key: "/works/OL123W",
      title: "Foundation",
      author_name: ["Isaac Asimov"],
      first_publish_year: 1951,
      editions: {
        docs: [{ key: "/books/OL456M", title: "Fundación", publish_year: 1951 }],
      },
    });
    expect(hit?.coverUrl).toBeNull();
  });
});
