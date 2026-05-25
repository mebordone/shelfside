import { join } from "@tauri-apps/api/path";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { listLibraryWithCatalog } from "$lib/db/library";
import { serializeMarkdownEntry } from "$lib/sync/parseMarkdown";
import { libraryMarkdownFilename } from "./slug";

function isDirAlreadyExists(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /already exists|EEXIST|os error 17|File exists/i.test(msg);
}

function isMkdirScopeForbidden(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /forbidden path|allow-mkdir/i.test(msg);
}

async function ensureLibraryDir(syncDir: string): Promise<string> {
  const libraryDir = await join(syncDir, "library");
  try {
    await mkdir(libraryDir, { recursive: true });
  } catch (e) {
    if (!isDirAlreadyExists(e) && !isMkdirScopeForbidden(e)) throw e;
  }
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
