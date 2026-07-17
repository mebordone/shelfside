import { UI_MEDIA_FILTER_TYPES } from "$lib/library/mediaFilterOptions";
import { STATUSES } from "$lib/db/types";

const MEDIA_KEY = "shelfside-library-media-filter";
const STATUS_KEY = "shelfside-library-status-filter";

export function readLibraryMediaFilter(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    if (raw != null && (UI_MEDIA_FILTER_TYPES as readonly string[]).includes(raw)) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function persistLibraryMediaFilter(value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MEDIA_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readLibraryStatusFilter(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw != null && (STATUSES as readonly string[]).includes(raw)) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function persistLibraryStatusFilter(value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STATUS_KEY, value);
  } catch {
    /* ignore */
  }
}
