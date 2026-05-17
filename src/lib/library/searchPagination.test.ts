import { describe, expect, it } from "vitest";
import {
  canSearchPageNext,
  canSearchPagePrev,
  formatSearchPageCounter,
  getPageSizeForSource,
} from "./searchPagination";

describe("searchPagination", () => {
  it("formatea contador de página y rango (OL)", () => {
    expect(formatSearchPageCounter(1, 10, 312, 10)).toBe("Página 2 de 32 · 11–20 de 312");
    expect(formatSearchPageCounter(0, 10, 5, 5)).toBe("Página 1 de 1 · 1–5 de 5");
  });

  it("formatea contador con totalPages de TMDB", () => {
    expect(formatSearchPageCounter(1, 20, 100, 18, 5)).toBe("Página 2 de 5 · 21–38 de 100");
  });

  it("navegación prev/next según total o totalPages", () => {
    expect(canSearchPagePrev(0)).toBe(false);
    expect(canSearchPagePrev(1)).toBe(true);
    expect(canSearchPageNext(0, 10, 25)).toBe(true);
    expect(canSearchPageNext(2, 10, 25)).toBe(false);
    expect(canSearchPageNext(0, 20, 100, 5)).toBe(true);
    expect(canSearchPageNext(4, 20, 100, 5)).toBe(false);
  });

  it("getPageSizeForSource devuelve 10 u 20", () => {
    expect(getPageSizeForSource("openlibrary")).toBe(10);
    expect(getPageSizeForSource("tmdb")).toBe(20);
  });
});
