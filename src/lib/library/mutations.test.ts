import { beforeEach, describe, expect, it } from "vitest";
import { librarySession } from "$lib/stores/librarySession.svelte";
import {
  afterLibraryChanged,
  clearHomeRefreshPending,
  homeRefreshPending,
} from "./mutations";

describe("afterLibraryChanged", () => {
  beforeEach(() => {
    librarySession.hydrated = true;
    librarySession.page = 2;
    librarySession.rows = [{ id: 1 } as never];
    clearHomeRefreshPending();
  });

  it("invalida librarySession y marca home para refresco", () => {
    afterLibraryChanged();
    expect(librarySession.hydrated).toBe(false);
    expect(librarySession.rows).toEqual([]);
    expect(homeRefreshPending()).toBe(true);
  });

  it("clearHomeRefreshPending resetea el flag", () => {
    afterLibraryChanged();
    clearHomeRefreshPending();
    expect(homeRefreshPending()).toBe(false);
  });
});
