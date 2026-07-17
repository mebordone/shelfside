import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSearchResults,
  consumePendingAutoSearch,
  handoffLibraryQueryToSearch,
  resetSearchSession,
  searchSession,
} from "./searchSession.svelte";

describe("searchSession helpers", () => {
  beforeEach(() => {
    resetSearchSession();
    searchSession.source = "tmdb";
  });

  it("resetSearchSession vacía query, hits y caché", () => {
    searchSession.query = "matrix";
    searchSession.hits = [
      {
        kind: "tmdb",
        mediaType: "movie",
        id: 1,
        title: "Matrix",
        overview: null,
        posterPath: null,
        yearLabel: "1999",
        thumb: null,
      },
    ];
    searchSession.pageCache = { 0: searchSession.hits };
    searchSession.pendingAutoSearch = true;

    resetSearchSession();

    expect(searchSession.query).toBe("");
    expect(searchSession.hits).toEqual([]);
    expect(searchSession.pageCache).toEqual({});
    expect(searchSession.pendingAutoSearch).toBe(false);
  });

  it("handoffLibraryQueryToSearch prepara auto-run", () => {
    handoffLibraryQueryToSearch("  dune  ");
    expect(searchSession.query).toBe("dune");
    expect(searchSession.pendingAutoSearch).toBe(true);
    expect(searchSession.hits).toEqual([]);
  });

  it("handoff con query vacía no marca pending", () => {
    handoffLibraryQueryToSearch("   ");
    expect(searchSession.query).toBe("");
    expect(searchSession.pendingAutoSearch).toBe(false);
  });

  it("consumePendingAutoSearch solo una vez", () => {
    handoffLibraryQueryToSearch("alien");
    expect(consumePendingAutoSearch()).toBe(true);
    expect(consumePendingAutoSearch()).toBe(false);
    expect(searchSession.query).toBe("alien");
  });

  it("clearSearchResults no borra la query", () => {
    searchSession.query = "keep";
    clearSearchResults();
    expect(searchSession.query).toBe("keep");
    expect(searchSession.hits).toEqual([]);
  });
});
