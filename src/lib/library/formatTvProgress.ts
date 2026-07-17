/** Progreso TV legible: sin guiones placeholder. */
export function formatTvProgress(
  currentSeason: number | null | undefined,
  lastEpisodeWatched: number | null | undefined,
): string | null {
  const hasSeason = currentSeason != null;
  const hasEpisode = lastEpisodeWatched != null;
  if (!hasSeason && !hasEpisode) return null;
  if (hasSeason && hasEpisode) return `T${currentSeason} · E${lastEpisodeWatched}`;
  if (hasSeason) return `T${currentSeason}`;
  return `E${lastEpisodeWatched}`;
}
