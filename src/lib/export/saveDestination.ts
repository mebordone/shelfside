import { downloadDir, join } from "@tauri-apps/api/path";
import { mkdir } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { isAndroidPlatform } from "$lib/platform";
import { ensureLibraryDir } from "$lib/sync/libraryDir";

export type MarkdownExportDestination = {
  /** Carpeta donde se escriben los `.md` (sin subcarpeta extra). */
  libraryDir: string;
  usedDownloadFallback: boolean;
};

/**
 * Destino del export Markdown: `syncFolder/library/` o, sin sync,
 * `$DOWNLOAD/shelfside-library/`.
 */
export async function resolveMarkdownExportDestination(
  syncFolder: string | null,
): Promise<MarkdownExportDestination> {
  if (syncFolder) {
    const libraryDir = await ensureLibraryDir(syncFolder);
    return { libraryDir, usedDownloadFallback: false };
  }
  const downloads = await downloadDir();
  const libraryDir = await join(downloads, "shelfside-library");
  try {
    await mkdir(libraryDir, { recursive: true });
  } catch {
    /* ya existe o el scope lo permite en la escritura */
  }
  return { libraryDir, usedDownloadFallback: true };
}

export type SavePathResult =
  | { kind: "cancelled" }
  | { kind: "picked"; path: string }
  | { kind: "fallback"; path: string };

/**
 * `dialog.save` primero; si falla en Android, escribe bajo Descargas.
 */
export async function resolveSavePath(opts: {
  defaultPath: string;
  filters: { name: string; extensions: string[] }[];
}): Promise<SavePathResult> {
  try {
    const dest = await save({
      defaultPath: opts.defaultPath,
      filters: opts.filters,
    });
    if (!dest) return { kind: "cancelled" };
    return { kind: "picked", path: dest };
  } catch (e) {
    if (!isAndroidPlatform()) throw e;
    const path = await join(await downloadDir(), opts.defaultPath);
    return { kind: "fallback", path };
  }
}
