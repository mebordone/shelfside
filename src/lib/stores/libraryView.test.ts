import { beforeEach, describe, expect, it } from "vitest";
import { persistLibraryView, readLibraryView } from "./libraryView";

describe("libraryView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("readLibraryView devuelve grid por defecto", () => {
    expect(readLibraryView()).toBe("grid");
  });

  it("persistLibraryView guarda list", () => {
    persistLibraryView("list");
    expect(readLibraryView()).toBe("list");
  });

  it("readLibraryView ignora valores inválidos", () => {
    localStorage.setItem("shelfside-library-view", "table");
    expect(readLibraryView()).toBe("grid");
  });
});
