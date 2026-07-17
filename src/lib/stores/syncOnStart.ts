import { readSyncFolder } from "./syncFolder";

const SYNC_ON_START_KEY = "shelfside-sync-on-start";

/**
 * Preferencia «sincronizar al abrir».
 * - `"1"` / `"0"`: valor explícito
 * - sin clave: `true` solo si ya hay carpeta sync configurada
 */
export function readSyncOnStart(): boolean {
  if (typeof localStorage === "undefined") return false;
  const v = localStorage.getItem(SYNC_ON_START_KEY);
  if (v === "0") return false;
  if (v === "1") return true;
  return readSyncFolder() !== null;
}

export function persistSyncOnStart(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SYNC_ON_START_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
