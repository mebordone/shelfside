import { TMDB_SEARCH_PAGE_SIZE } from "$lib/api/tmdb/client";
import { OPEN_LIBRARY_SEARCH_PAGE_SIZE } from "$lib/api/openlibrary/types";
import type { SearchSource } from "$lib/stores/searchSession.svelte";

/** Etiqueta «Página 2 de 31 · 11–20 de 312». */
export function formatSearchPageCounter(
  page: number,
  pageSize: number,
  total: number,
  shownCount: number,
  totalPages = 0,
): string {
  if (total <= 0) return "";
  const pageTotal =
    totalPages > 0 ? totalPages : Math.max(1, Math.ceil(total / pageSize));
  const start = page * pageSize + 1;
  const end = Math.min(start + Math.max(shownCount, 1) - 1, total);
  return `Página ${page + 1} de ${pageTotal} · ${start}–${end} de ${total}`;
}

/** Rango compacto «11–20» para la barra meta (sin controles). */
export function formatSearchPageRange(
  page: number,
  pageSize: number,
  total: number,
  shownCount: number,
): { start: number; end: number; total: number } | null {
  if (total <= 0) return null;
  const start = page * pageSize + 1;
  const end = Math.min(start + Math.max(shownCount, 1) - 1, total);
  return { start, end, total };
}

export function canSearchPagePrev(page: number): boolean {
  return page > 0;
}

/**
 * @param totalPages Si > 0 (TMDB), usa total_pages de la API; si 0 (OL), usa total y pageSize.
 */
export function canSearchPageNext(
  page: number,
  pageSize: number,
  total: number,
  totalPages = 0,
): boolean {
  if (totalPages > 0) return page + 1 < totalPages;
  return (page + 1) * pageSize < total;
}

export function getPageSizeForSource(source: SearchSource): number {
  return source === "openlibrary" ? OPEN_LIBRARY_SEARCH_PAGE_SIZE : TMDB_SEARCH_PAGE_SIZE;
}

export { OPEN_LIBRARY_SEARCH_PAGE_SIZE, TMDB_SEARCH_PAGE_SIZE };
