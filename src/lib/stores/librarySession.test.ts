import { describe, expect, it } from "vitest";
import { clearLibraryPagination, librarySession } from "./librarySession.svelte";

describe("librarySession", () => {
  it("clearLibraryPagination reinicia lista y caché", () => {
    librarySession.page = 2;
    librarySession.total = 40;
    librarySession.rows = [{ id: 1 } as never];
    librarySession.pageCache = { 0: [{ id: 1 } as never] };

    clearLibraryPagination();

    expect(librarySession.page).toBe(0);
    expect(librarySession.total).toBe(0);
    expect(librarySession.rows).toEqual([]);
    expect(librarySession.pageCache).toEqual({});
  });
});
