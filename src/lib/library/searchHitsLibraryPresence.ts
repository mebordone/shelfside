import type { SqlDb } from "$lib/db/catalog";
import { getOpenLibraryHitsLibraryPresence, getTmdbHitsLibraryPresence } from "$lib/db/library";
import type { SearchHitRow } from "$lib/stores/searchSession.svelte";

/** Clave estable por fila de resultados (misma que en `/search`). */
export function searchHitKey(h: SearchHitRow): string {
  return h.kind === "tmdb" ? `tmdb-${h.mediaType}-${h.id}` : `ol-${h.editionId}`;
}

/**
 * Presence batch para la lista de búsqueda.
 * Claves del mapa = `searchHitKey(hit)` → `library_entry.id` o `null`.
 */
export async function getSearchHitsLibraryPresence(
  db: SqlDb,
  hits: SearchHitRow[],
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (hits.length === 0) return out;

  const tmdbHits = hits.filter((h) => h.kind === "tmdb");
  const olHits = hits.filter((h) => h.kind === "openlibrary");

  if (tmdbHits.length > 0) {
    const presence = await getTmdbHitsLibraryPresence(
      db,
      tmdbHits.map((h) => ({ mediaType: h.mediaType, id: h.id })),
    );
    for (const h of tmdbHits) {
      out.set(searchHitKey(h), presence.get(`${h.mediaType}-${h.id}`) ?? null);
    }
  }

  if (olHits.length > 0) {
    const presence = await getOpenLibraryHitsLibraryPresence(
      db,
      olHits.map((h) => ({ editionId: h.editionId })),
    );
    for (const h of olHits) {
      out.set(searchHitKey(h), presence.get(h.editionId) ?? null);
    }
  }

  return out;
}
