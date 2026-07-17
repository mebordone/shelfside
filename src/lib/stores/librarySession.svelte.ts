import type { LibraryListRow } from "$lib/db";
import {
  persistLibraryMediaFilter,
  persistLibraryStatusFilter,
  readLibraryMediaFilter,
  readLibraryStatusFilter,
} from "$lib/stores/libraryFilters";

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

/** Restaura filtros persistidos (tipo/estado) en el primer montaje de la sesión. */
export function initLibraryFilters(): void {
  if (librarySession.hydrated) return;
  librarySession.mediaFilter = readLibraryMediaFilter();
  librarySession.statusFilter = readLibraryStatusFilter();
}

/** Cambia el filtro de tipo, lo persiste y limpia paginación. */
export function setLibraryMediaFilter(value: string): void {
  librarySession.mediaFilter = value;
  persistLibraryMediaFilter(value);
  clearLibraryPagination();
}

/** Cambia el filtro de estado, lo persiste y limpia paginación. */
export function setLibraryStatusFilter(value: string): void {
  librarySession.statusFilter = value;
  persistLibraryStatusFilter(value);
  clearLibraryPagination();
}

export function clearLibraryPagination(): void {
  librarySession.page = 0;
  librarySession.total = 0;
  librarySession.pageCache = {};
  librarySession.rows = [];
}

/** Vacía el texto de búsqueda y la caché de páginas (botón limpiar). */
export function clearLibrarySearch(): void {
  librarySession.search = "";
  clearLibraryPagination();
  librarySession.hydrated = false;
}

/**
 * Abre Biblioteca filtrada por estado (desde Inicio «Ver todos»).
 * El caller navega a /library; la página recarga por hydrated=false.
 */
export function openLibraryStatusFilter(status: string): void {
  librarySession.statusFilter = status;
  persistLibraryStatusFilter(status);
  clearLibraryPagination();
  librarySession.hydrated = false;
}

/** Tras borrar o cambios fuera de esta pantalla: forzar recarga al volver a Biblioteca. */
export function invalidateLibrarySession(): void {
  clearLibraryPagination();
  librarySession.hydrated = false;
}
