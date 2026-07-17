import { describe, expect, it } from "vitest";
import { navActive } from "./navActive";

describe("navActive", () => {
  it("detecta secciones principales", () => {
    expect(navActive("/", "home")).toBe(true);
    expect(navActive("/library/1", "library")).toBe(true);
    expect(navActive("/search", "search")).toBe(true);
  });

  it("marca more para settings, stats y manual", () => {
    expect(navActive("/settings", "more")).toBe(true);
    expect(navActive("/stats", "more")).toBe(true);
    expect(navActive("/add/manual", "more")).toBe(true);
    expect(navActive("/library", "more")).toBe(false);
  });

});