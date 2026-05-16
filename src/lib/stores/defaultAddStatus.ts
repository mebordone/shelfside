import { isStatus, type Status } from "$lib/db/types";

const STORAGE_KEY = "shelfside-default-add-status";

export function readDefaultAddStatus(): Status {
  if (typeof localStorage === "undefined") return "planning";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null && isStatus(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "planning";
}

export function persistDefaultAddStatus(status: Status): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch {
    /* ignore */
  }
}
