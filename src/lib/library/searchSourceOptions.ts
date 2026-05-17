import type { FilterChipOption } from "$lib/components/FilterChipBar.svelte";
import { UI_MEDIA_FILTER_TYPES } from "./mediaFilterOptions";
import { STATUSES } from "$lib/db/types";

export const SEARCH_SOURCE_OPTIONS = ["tmdb", "openlibrary"] as const;
export type SearchSourceOption = (typeof SEARCH_SOURCE_OPTIONS)[number];

type Translate = (key: string) => string;

export function buildSearchSourceChipOptions(t: Translate): FilterChipOption[] {
  return SEARCH_SOURCE_OPTIONS.map((id) => ({
    value: id,
    label: t(`search.source_${id}_short`),
    title: t(`search.source_${id}`),
  }));
}

export function buildMediaFilterChipOptions(
  t: Translate,
  mediaLabel: (mediaType: string) => string,
): FilterChipOption[] {
  return UI_MEDIA_FILTER_TYPES.map((mt) => ({
    value: mt,
    label: mediaLabel(mt),
  }));
}

export function buildStatusFilterChipOptions(
  t: Translate,
  statusLabel: (status: string) => string,
): FilterChipOption[] {
  return STATUSES.map((st) => ({
    value: st,
    label: statusLabel(st),
  }));
}
