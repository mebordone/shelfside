import { join } from "@tauri-apps/api/path";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { listLibraryWithCatalog } from "$lib/db/library";
import { serializeMarkdownEntry } from "$lib/sync/parseMarkdown";
import { libraryMarkdownFilename } from "./slug";

async function ensureLibraryDir(syncDir: string): Promise<string> {
  const libraryDir = await join(syncDir, "library");
  await mkdir(libraryDir, { recursive: true });
  return libraryDir;
}

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
