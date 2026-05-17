import { UI_MEDIA_FILTER_TYPES, type UiMediaFilterType } from "$lib/library/mediaFilterOptions";

const STORAGE_KEY = "shelfside-home-media-filter";

export type HomeMediaFilter = "" | UiMediaFilterType;

export function readHomeMediaFilter(): HomeMediaFilter {
  if (typeof localStorage === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "") return "";
    if (raw != null && (UI_MEDIA_FILTER_TYPES as readonly string[]).includes(raw)) {
      return raw as UiMediaFilterType;
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function persistHomeMediaFilter(value: HomeMediaFilter): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
