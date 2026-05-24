const SYNC_FOLDER_KEY = "shelfside-sync-dir";

export function readSyncFolder(): string | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(SYNC_FOLDER_KEY)?.trim();
  return v || null;
}

export function persistSyncFolder(path: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SYNC_FOLDER_KEY, path.trim());
}

export function clearSyncFolder(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SYNC_FOLDER_KEY);
}
