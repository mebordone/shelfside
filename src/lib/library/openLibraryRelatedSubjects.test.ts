import { describe, expect, it } from "vitest";
import { normalizeSubject, pickRelatedSubjects } from "./openLibraryRelatedSubjects";

const DUNE_SUBJECTS = [
  "Dune (Imaginary place)",
  "Fiction",
  "Fiction, science fiction, general",
  "Dune (imaginary place), fiction",
  "New York Times reviewed",
  "Science fiction",
  "Science-fiction",
  "American literature",
  "nyt:mass-market-monthly=2021-11-07",
  "New York Times bestseller",
  "award:nebula_award=novel",
  "nyt:trade-fiction-paperback=2021-11-07",
  "Hugo Award Winner",
  "award:hugo_award=1966",
  "award:hugo_award=novel",
  "American Science fiction",
  "Long Now Manual for Civilization",
  "Ecology",
  "Fantasy fiction",
];

describe("normalizeSubject", () => {
  it("unifica variantes de science fiction", () => {
    expect(normalizeSubject("Science fiction")).toBe("science_fiction");
    expect(normalizeSubject("Science-fiction")).toBe("science_fiction");
    expect(normalizeSubject("Fiction, science fiction, general")).toBe("science_fiction");
    expect(normalizeSubject("American Science fiction")).toBe("science_fiction");
  });

  it("preserva prefijos nyt/award para blacklist", () => {
    expect(normalizeSubject("nyt:mass-market-monthly=2021-11-07")).toMatch(/^nyt:/);
    expect(normalizeSubject("award:hugo_award=1966")).toMatch(/^award:/);
  });
});

describe("pickRelatedSubjects", () => {
  it("excluye fiction y tags ruidosos de Dune; incluye science_fiction y ecology", () => {
    const picked = pickRelatedSubjects(DUNE_SUBJECTS);
    expect(picked.slugs).not.toContain("fiction");
    expect(picked.slugs).not.toContain("american_literature");
    expect(picked.slugs.some((s) => s.startsWith("nyt:"))).toBe(false);
    expect(picked.slugs.some((s) => s.startsWith("award:"))).toBe(false);
    expect(picked.slugs).not.toContain("long_now_manual_for_civilization");
    expect(picked.genre).toBe("science_fiction");
    expect(picked.theme).toBe("ecology");
    expect(picked.pair).toEqual({ genre: "science_fiction", theme: "ecology" });
    expect(picked.slugs).toContain("science_fiction");
    expect(picked.slugs).toContain("ecology");
    expect(picked.slugs.length).toBeLessThanOrEqual(5);
  });

  it("prioriza género sobre universo específico", () => {
    const picked = pickRelatedSubjects(DUNE_SUBJECTS);
    const genreIdx = picked.slugs.indexOf("science_fiction");
    const universeIdx = picked.slugs.findIndex((s) => s.includes("dune"));
    expect(genreIdx).toBeGreaterThanOrEqual(0);
    if (universeIdx >= 0) {
      expect(genreIdx).toBeLessThan(universeIdx);
    }
  });

  it("sin tema concreto no arma par", () => {
    const picked = pickRelatedSubjects(["Science fiction", "Fiction"]);
    expect(picked.genre).toBe("science_fiction");
    expect(picked.theme).toBeNull();
    expect(picked.pair).toBeNull();
  });

  it("lista vacía o null", () => {
    expect(pickRelatedSubjects([])).toEqual({
      slugs: [],
      genre: null,
      theme: null,
      pair: null,
    });
    expect(pickRelatedSubjects(null).slugs).toEqual([]);
  });
});
