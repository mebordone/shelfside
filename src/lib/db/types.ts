export const MEDIA_TYPES = ["movie", "tv", "season", "episode", "anime", "game", "book"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const SOURCES = ["tmdb", "manual", "openlibrary"] as const;
export type Source = (typeof SOURCES)[number];

export const STATUSES = ["completed", "in_progress", "planning", "paused", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

export type CatalogItemRow = {
  id: number;
  media_type: string;
  source: string;
  external_id: string;
  title: string;
  image_url: string | null;
  poster_local_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  parent_catalog_id: number | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryEntryRow = {
  id: number;
  catalog_item_id: number;
  status: string;
  score: number | null;
  current_season: number | null;
  last_episode_watched: number | null;
  progress_current: number | null;
  progress_total: number | null;
  owned: number | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
};

export type LibraryListRow = LibraryEntryRow & {
  media_type: string;
  source: string;
  external_id: string;
  title: string;
  image_url: string | null;
  poster_local_path: string | null;
  /** JSON de TMDB u otras fuentes; en TV suele incluir number_of_seasons. */
  metadata_json: string | null;
};

export function isStatus(s: string): s is Status {
  return (STATUSES as readonly string[]).includes(s);
}

export function isMediaType(s: string): s is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(s);
}
