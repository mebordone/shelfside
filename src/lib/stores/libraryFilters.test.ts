import { beforeEach, describe, expect, it } from "vitest";
import {
  persistLibraryMediaFilter,
  persistLibraryStatusFilter,
  readLibraryMediaFilter,
  readLibraryStatusFilter,
} from "./libraryFilters";

describe("libraryFilters", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filtros vacíos por defecto", () => {
    expect(readLibraryMediaFilter()).toBe("");
    expect(readLibraryStatusFilter()).toBe("");
  });

  it("persiste y lee media filter válido", () => {
    persistLibraryMediaFilter("movie");
    expect(readLibraryMediaFilter()).toBe("movie");
  });

  it("ignora media filter inválido", () => {
    localStorage.setItem("shelfside-library-media-filter", "anime");
    expect(readLibraryMediaFilter()).toBe("");
  });

  it("persiste y lee status filter válido", () => {
    persistLibraryStatusFilter("planning");
    expect(readLibraryStatusFilter()).toBe("planning");
  });

  it("ignora status filter inválido", () => {
    localStorage.setItem("shelfside-library-status-filter", "watching");
    expect(readLibraryStatusFilter()).toBe("");
  });
});
