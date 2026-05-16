/** Campos útiles de GET /tv/{id} guardados en `catalog_item.metadata_json`. */
export type TmdbTvCatalogFields = {
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  /** Valores típicos TMDB en inglés: Ended, Returning Series, etc. */
  showStatus: string | null;
};

function optionalTruncInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

function optionalNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export function tmdbTvCatalogFromMetadata(metadataJson: string | null): TmdbTvCatalogFields | null {
  if (!metadataJson?.trim()) return null;
  try {
    const o = JSON.parse(metadataJson) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    const numberOfSeasons = optionalTruncInt(rec.number_of_seasons);
    const numberOfEpisodes = optionalTruncInt(rec.number_of_episodes);
    const showStatus = optionalNonEmptyString(rec.status);
    if (numberOfSeasons == null && numberOfEpisodes == null && showStatus == null) return null;
    return { numberOfSeasons, numberOfEpisodes, showStatus };
  } catch {
    return null;
  }
}
