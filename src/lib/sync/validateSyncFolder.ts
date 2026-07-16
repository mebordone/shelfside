import { join } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { syncCsvPath } from "./csvPath";

export type SyncFolderValidation =
  | { ok: true; path: string }
  | { ok: false; reason: "empty" | "inaccessible" | "not_creatable"; detail?: string };

/** Nombre de la subcarpeta Shelfside dentro de la carpeta Syncthing. */
export const SYNC_SUBDIR_NAME = "shelfside";

/** True si `path` ya apunta a una carpeta llamada `shelfside`. */
export function isShelfsideSyncDir(path: string): boolean {
  const normalized = path.replace(/[/\\]+$/, "");
  const base = normalized.split(/[/\\]/).pop() ?? "";
  return base.toLowerCase() === SYNC_SUBDIR_NAME;
}

/**
 * Resuelve la carpeta efectiva de sync: si el usuario eligió la raíz Syncthing
 * (p. ej. `~/Sync`), usa `~/Sync/shelfside`; si ya eligió `…/shelfside`, la deja.
 */
export async function resolveEffectiveSyncDir(raw: string): Promise<string> {
  const trimmed = raw.trim().replace(/[/\\]+$/, "");
  if (!trimmed) return trimmed;
  if (isShelfsideSyncDir(trimmed)) return trimmed;
  return join(trimmed, SYNC_SUBDIR_NAME);
}

/** Valida, crea `shelfside/` si hace falta, y devuelve la ruta efectiva a persistir. */
export async function validateSyncFolderPath(raw: string): Promise<SyncFolderValidation> {
  const input = raw.trim();
  if (!input) return { ok: false, reason: "empty" };

  try {
    const path = await resolveEffectiveSyncDir(input);
    if (!path) return { ok: false, reason: "empty" };

    const dirOk = await exists(path);
    if (!dirOk) {
      try {
        await mkdir(path, { recursive: true });
      } catch (e) {
        return {
          ok: false,
          reason: "not_creatable",
          detail: e instanceof Error ? e.message : String(e),
        };
      }
    }

    // El CSV se crea al sincronizar; solo necesitamos carpeta escribible.
    void (await syncCsvPath(path));
    return { ok: true, path };
  } catch (e) {
    return {
      ok: false,
      reason: "inaccessible",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
