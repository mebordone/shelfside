import { appLocalDataDir } from "@tauri-apps/api/path";
import { resolvePosterDisplayUrl } from "./displayUrl";

let cachedAppRoot: string | null = null;

async function getAppRootOnce(): Promise<string | null> {
  if (cachedAppRoot != null) return cachedAppRoot;
  try {
    cachedAppRoot = await appLocalDataDir();
    return cachedAppRoot;
  } catch {
    return null;
  }
}

export type WithDisplayUrl<T> = T & { displayUrl: string | null };

/** Resuelve URLs de poster para filas de biblioteca (un solo appLocalDataDir por lote). */
export async function mapLibraryRowsWithPosters<
  T extends { poster_local_path: string | null; image_url: string | null },
>(rows: T[]): Promise<WithDisplayUrl<T>[]> {
  await getAppRootOnce();
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      displayUrl: await resolvePosterDisplayUrl(r.poster_local_path, r.image_url),
    })),
  );
}
