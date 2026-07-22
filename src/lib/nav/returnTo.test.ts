import { describe, expect, it } from "vitest";
import { safeAppReturnTo, withReturnTo } from "./returnTo";

describe("safeAppReturnTo", () => {
  it("acepta rutas internas de search y library", () => {
    expect(safeAppReturnTo("/search")).toBe("/search");
    expect(safeAppReturnTo("/library/42")).toBe("/library/42");
    expect(safeAppReturnTo(encodeURIComponent("/library/7"))).toBe("/library/7");
  });

  it("rechaza open redirects y basura", () => {
    expect(safeAppReturnTo("//evil.com")).toBeNull();
    expect(safeAppReturnTo("https://evil.com")).toBeNull();
    expect(safeAppReturnTo("/settings")).toBeNull();
    expect(safeAppReturnTo("")).toBeNull();
    expect(safeAppReturnTo(null)).toBeNull();
  });
});

describe("withReturnTo", () => {
  it("añade query returnTo", () => {
    expect(withReturnTo("/search/book/OL1M", "/library/3")).toBe(
      "/search/book/OL1M?returnTo=%2Flibrary%2F3",
    );
  });

  it("no altera href si returnTo inválido", () => {
    expect(withReturnTo("/search/book/OL1M", "//x")).toBe("/search/book/OL1M");
  });
});
