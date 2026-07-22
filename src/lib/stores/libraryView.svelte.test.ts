import { beforeEach, describe, expect, it } from "vitest";
import {
  initLibraryView,
  libraryView,
  persistLibraryView,
  readLibraryView,
  setLibraryView,
} from "./libraryView.svelte";

describe("libraryView", () => {
  beforeEach(() => {
    localStorage.clear();
    libraryView.current = "grid";
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

  it("setLibraryView actualiza estado reactivo y persiste", () => {
    setLibraryView("list");
    expect(libraryView.current).toBe("list");
    expect(readLibraryView()).toBe("list");
  });

  it("initLibraryView hidrata desde localStorage", () => {
    persistLibraryView("list");
    libraryView.current = "grid";
    initLibraryView();
    expect(libraryView.current).toBe("list");
  });
});
