import { invalidateLibrarySession } from "$lib/stores/librarySession.svelte";

let homeNeedsRefresh = false;

export function homeRefreshPending(): boolean {
  return homeNeedsRefresh;
}

export function clearHomeRefreshPending(): void {
  homeNeedsRefresh = false;
}

/** Tras borrar, editar, import merge u otras mutaciones de biblioteca. */
export function afterLibraryChanged(): void {
  invalidateLibrarySession();
  homeNeedsRefresh = true;
}
