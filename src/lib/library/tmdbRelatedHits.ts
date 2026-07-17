import type { TmdbSearchHit } from "$lib/api/tmdb/client";

/** Máximo de tarjetas en el carrusel de relacionados (preview). */
export const RELATED_TMDB_HITS_CAP = 12;

/** Tope al ir cargando páginas en el sheet «Ver más». */
export const RELATED_TMDB_SHEET_CAP = 60;

function appendUniqueHits(
  out: TmdbSearchHit[],
  list: TmdbSearchHit[],
  seen: Set<string>,
  excludeKey: string | null,
  cap: number,
): boolean {
  for (const h of list) {
    const key = `${h.mediaType}-${h.id}`;
    if (excludeKey != null && key === excludeKey) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= cap) return true;
  }
  return false;
}

/**
 * Une listas de hits TMDB en orden: primero todas las de `lists[0]`, luego `lists[1]`, etc.
 * Omite duplicados por (mediaType, id) y el ítem actual si se indica.
 */
export function mergeRelatedTmdbHits(
  lists: TmdbSearchHit[][],
  opts: {
    cap: number;
    excludeMediaType?: "movie" | "tv";
    excludeId?: number;
  },
): TmdbSearchHit[] {
  const seen = new Set<string>();
  const out: TmdbSearchHit[] = [];
  const excludeKey =
    opts.excludeMediaType != null && opts.excludeId != null
      ? `${opts.excludeMediaType}-${opts.excludeId}`
      : null;

  for (const list of lists) {
    if (appendUniqueHits(out, list, seen, excludeKey, opts.cap)) break;
  }
  return out;
}
