import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLibrarySearch,
  initLibraryFilters,
  librarySession,
  openLibraryStatusFilter,
  setLibraryMediaFilter,
  setLibraryStatusFilter,
} from "./librarySession.svelte";
import { readLibraryMediaFilter, readLibraryStatusFilter } from "./libraryFilters";

describe("librarySession helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    librarySession.mediaFilter = "";
    librarySession.statusFilter = "";
    librarySession.search = "";
    librarySession.rows = [];
    librarySession.page = 0;
    librarySession.total = 0;
    librarySession.pageCache = {};
    librarySession.hydrated = true;
  });

  it("clearLibrarySearch vacía texto y fuerza recarga", () => {
    librarySession.search = "foo";
    librarySession.pageCache = { 0: [] };
    librarySession.hydrated = true;

    clearLibrarySearch();

    expect(librarySession.search).toBe("");
    expect(librarySession.pageCache).toEqual({});
    expect(librarySession.hydrated).toBe(false);
  });

  it("openLibraryStatusFilter setea estado y marca no hydrated", () => {
    openLibraryStatusFilter("planning");
    expect(librarySession.statusFilter).toBe("planning");
    expect(librarySession.hydrated).toBe(false);
    expect(librarySession.page).toBe(0);
    expect(readLibraryStatusFilter()).toBe("planning");
  });

  it("setLibraryMediaFilter/StatusFilter persisten los filtros", () => {
    setLibraryMediaFilter("movie");
    setLibraryStatusFilter("paused");
    expect(librarySession.mediaFilter).toBe("movie");
    expect(librarySession.statusFilter).toBe("paused");
    expect(readLibraryMediaFilter()).toBe("movie");
    expect(readLibraryStatusFilter()).toBe("paused");
  });

  it("initLibraryFilters restaura filtros persistidos si no está hydrated", () => {
    setLibraryMediaFilter("book");
    setLibraryStatusFilter("completed");
    librarySession.mediaFilter = "";
    librarySession.statusFilter = "";
    librarySession.hydrated = false;

    initLibraryFilters();

    expect(librarySession.mediaFilter).toBe("book");
    expect(librarySession.statusFilter).toBe("completed");
  });
});
