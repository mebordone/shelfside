import { join } from "@tauri-apps/api/path";
import { mkdir } from "@tauri-apps/plugin-fs";

function isDirAlreadyExists(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /already exists|EEXIST|os error 17|File exists/i.test(msg);
}

function isMkdirScopeForbidden(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /forbidden path|allow-mkdir/i.test(msg);
}

export async function ensureLibraryDir(syncDir: string): Promise<string> {
  const libraryDir = await join(syncDir, "library");
  try {
    await mkdir(libraryDir, { recursive: true });
  } catch (e) {
    if (!isDirAlreadyExists(e) && !isMkdirScopeForbidden(e)) throw e;
  }
  return libraryDir;
}
