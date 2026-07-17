import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import type { TmdbSearchHit } from "$lib/api/tmdb/client";

export type SearchSource = "tmdb" | "openlibrary";

export type TmdbSearchHitRow = TmdbSearchHit & { kind: "tmdb"; thumb: string | null };
export type OpenLibrarySearchHitRow = OpenLibrarySearchHit & { kind: "openlibrary"; thumb: string | null };
export type SearchHitRow = TmdbSearchHitRow | OpenLibrarySearchHitRow;

/**
 * Estado de la pantalla Buscar: persiste al cambiar de ruta hasta la próxima búsqueda.
 */
export const searchSession = $state({
  source: "tmdb" as SearchSource,
  query: "",
  hits: [] as SearchHitRow[],
  err: null as string | null,
  msg: null as string | null,
  /** Paginación compartida (TMDB y Open Library); caché evita repetir peticiones. */
  page: 0,
  total: 0,
  /** > 0 solo TMDB (total_pages API); OL usa 0 y calcula con total/pageSize. */
  totalPages: 0,
  pageSize: 10,
  pageCache: {} as Record<number, SearchHitRow[]>,
  /** Tras handoff desde Biblioteca: ejecutar búsqueda al montar /search. */
  pendingAutoSearch: false,
});

export function clearSearchPagination(): void {
  searchSession.page = 0;
  searchSession.total = 0;
  searchSession.totalPages = 0;
  searchSession.pageSize = 10;
  searchSession.pageCache = {};
}

export function clearSearchResults(): void {
  searchSession.hits = [];
  searchSession.err = null;
  searchSession.msg = null;
  clearSearchPagination();
}

/** Vacía query, resultados y caché (botón limpiar). */
export function resetSearchSession(): void {
  searchSession.query = "";
  searchSession.pendingAutoSearch = false;
  clearSearchResults();
}

/**
 * Prepara /search con el texto de Biblioteca y marca auto-run.
 * No navega: el caller hace goto.
 */
export function handoffLibraryQueryToSearch(libraryQuery: string): void {
  const q = libraryQuery.trim();
  searchSession.query = q;
  clearSearchResults();
  searchSession.pendingAutoSearch = q.length > 0;
}

/** Consume el flag; true si hay que ejecutar runSearch(). */
export function consumePendingAutoSearch(): boolean {
  if (!searchSession.pendingAutoSearch) return false;
  searchSession.pendingAutoSearch = false;
  return searchSession.query.trim().length > 0;
}
