import type { TmdbSearchHit } from "$lib/api/tmdb/client";

/** Fila de resultado con miniatura ya resuelta para la UI. */
export type SearchHitRow = TmdbSearchHit & { thumb: string | null };

/**
 * Estado de la pantalla Buscar TMDB: persiste al cambiar de ruta hasta la próxima búsqueda.
 * No se serializa en disco (solo memoria de la sesión de la app).
 */
export const searchSession = $state({
  query: "",
  hits: [] as SearchHitRow[],
  err: null as string | null,
  msg: null as string | null,
});
