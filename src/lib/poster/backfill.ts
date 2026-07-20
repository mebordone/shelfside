import { setPosterLocalPath, type SqlDb } from "$lib/db";
import { downloadPosterToApp, guessImageExtFromPath, posterRelativePath } from "./storage";

type MissingPosterRow = {
  id: number;
  media_type: string;
  external_id: string;
  image_url: string;
};

export type BackfillResult = {
  scanned: number;
  downloaded: number;
  failed: number;
};

const CONCURRENCY = 4;

/**
 * Descarga y persiste el poster local de los ítems de catálogo que tienen `image_url`
 * pero no `poster_local_path` (típicamente ítems llegados por sincronización, o cuya
 * descarga inicial falló). Así dejan de depender de la red en cada apertura.
 * Es idempotente y tolera fallos por ítem.
 */
export async function backfillMissingPosters(db: SqlDb): Promise<BackfillResult> {
  const rows = await db.select<MissingPosterRow[]>(
    `SELECT id, media_type, external_id, image_url
       FROM catalog_item
      WHERE (poster_local_path IS NULL OR poster_local_path = '')
        AND image_url IS NOT NULL AND image_url <> ''`,
  );

  let downloaded = 0;
  let failed = 0;

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < rows.length) {
      const r = rows[cursor++]!;
      try {
        const ext = guessImageExtFromPath(r.image_url);
        const rel = posterRelativePath(r.media_type, r.external_id, ext);
        await downloadPosterToApp(r.image_url, rel);
        await setPosterLocalPath(db, r.id, rel);
        downloaded += 1;
      } catch {
        failed += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker()),
  );

  return { scanned: rows.length, downloaded, failed };
}
