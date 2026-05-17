import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/client";

export const RELATED_OPEN_LIBRARY_HITS_CAP = 16;

export function mergeRelatedOpenLibraryHits(
  lists: OpenLibrarySearchHit[][],
  opts: { cap: number; excludeEditionId?: string },
): OpenLibrarySearchHit[] {
  const seen = new Set<string>();
  const out: OpenLibrarySearchHit[] = [];
  const exclude = opts.excludeEditionId ?? null;

  for (const list of lists) {
    for (const h of list) {
      if (exclude != null && h.editionId === exclude) continue;
      if (seen.has(h.editionId)) continue;
      seen.add(h.editionId);
      out.push(h);
      if (out.length >= opts.cap) return out;
    }
  }
  return out;
}
