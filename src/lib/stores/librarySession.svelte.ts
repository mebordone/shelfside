import type { LibraryListRow } from "$lib/db";

export type LibraryListRowWithPoster = LibraryListRow & { displayUrl: string | null };

/**
 * Estado de la pantalla Biblioteca: persiste al cambiar de ruta hasta aplicar nuevos filtros.
 */
export const librarySession = $state({
  mediaFilter: "",
  statusFilter: "",
  search: "",
  rows: [] as LibraryListRowWithPoster[],
  page: 0,
  total: 0,
  pageCache: {} as Record<number, LibraryListRowWithPoster[]>,
  hydrated: false,
});

export function clearLibraryPagination(): void {
  librarySession.page = 0;
  librarySession.total = 0;
  librarySession.pageCache = {};
  librarySession.rows = [];
}

/** Tras borrar o cambios fuera de esta pantalla: forzar recarga al volver a Biblioteca. */
export function invalidateLibrarySession(): void {
  clearLibraryPagination();
  librarySession.hydrated = false;
}
