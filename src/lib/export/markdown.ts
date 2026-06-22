import { join } from "@tauri-apps/api/path";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { listLibraryWithCatalog } from "$lib/db/library";
import { serializeMarkdownEntry } from "$lib/sync/parseMarkdown";
import { ensureLibraryDir } from "$lib/sync/libraryDir";
import { libraryMarkdownFilename } from "./slug";

export async function exportAllMarkdownToFolder(db: SqlDb, syncDir: string): Promise<number> {
  const rows = await listLibraryWithCatalog(db, {});
  const catalogRows = await db.select<{ id: number; updated_at: string }[]>(
    "SELECT id, updated_at FROM catalog_item",
  );
  const catalogMap = new Map(catalogRows.map((c) => [c.id, c.updated_at]));
  const libraryDir = await ensureLibraryDir(syncDir);

  for (const r of rows) {
    const content = serializeMarkdownEntry({
      id: r.id,
      updated_at: r.updated_at,
      title: r.title,
      media_type: r.media_type,
      source: r.source,
      external_id: r.external_id,
      status: r.status,
      score: r.score,
      current_season: r.current_season,
      last_episode_watched: r.last_episode_watched,
      progress_current: r.progress_current,
      progress_total: r.progress_total,
      owned: r.owned,
      started_at: r.started_at,
      completed_at: r.completed_at,
      image_url: r.image_url,
      catalog_updated_at: catalogMap.get(r.catalog_item_id) ?? null,
      notes: r.notes,
    });
    const filename = libraryMarkdownFilename(r.title, r.id);
    const path = await join(libraryDir, filename);
    await writeTextFile(path, content);
  }

  return rows.length;
}
