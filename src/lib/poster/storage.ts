import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";

const POSTERS_DIR = "posters";

export function posterRelativePath(mediaType: string, id: string | number, ext: string): string {
  const safe = String(mediaType).replace(/[^a-z0-9]/gi, "_");
  return `${POSTERS_DIR}/${safe}_${id}.${ext}`;
}

export async function ensurePostersDir(): Promise<void> {
  if (!(await exists(POSTERS_DIR, { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir(POSTERS_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
}

export async function writeBytesUnderApp(relativePath: string, data: Uint8Array): Promise<void> {
  const slash = relativePath.lastIndexOf("/");
  if (slash > 0) {
    const parent = relativePath.slice(0, slash);
    await mkdir(parent, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
  await writeFile(relativePath, data, { baseDir: BaseDirectory.AppLocalData });
}

/** Descarga una URL de imagen y la guarda bajo BaseDirectory.AppLocalData. Devuelve ruta relativa. */
export async function downloadPosterToApp(remoteUrl: string, relativeDest: string): Promise<string> {
  await ensurePostersDir();
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`Poster: HTTP ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  await writeBytesUnderApp(relativeDest, buf);
  return relativeDest;
}

export function guessImageExtFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  return "img";
}

/** Lee bytes de una ruta absoluta (p. ej. archivo elegido con diálogo en modo copy). */
export async function readFileAbsolute(path: string): Promise<Uint8Array> {
  return readFile(path);
}

export async function saveManualPosterCopy(
  sourceAbsolutePath: string,
  destRelative: string,
): Promise<string> {
  await ensurePostersDir();
  const bytes = await readFileAbsolute(sourceAbsolutePath);
  await writeBytesUnderApp(destRelative, bytes);
  return destRelative;
}
