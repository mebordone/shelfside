import { join } from "@tauri-apps/api/path";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { LibraryListRow } from "$lib/db/types";
import { libraryMarkdownFilename } from "$lib/export/slug";
import { ensureLibraryDir } from "./libraryDir";
import { serializeTombstoneEntry } from "./parseMarkdown";

export async function writeTombstoneToSyncFolder(
  syncDir: string,
  row: LibraryListRow,
  deletedAt: string = new Date().toISOString(),
): Promise<void> {
  const libraryDir = await ensureLibraryDir(syncDir);
  const content = serializeTombstoneEntry(
    {
      id: row.id,
      updated_at: row.updated_at,
      title: row.title,
      media_type: row.media_type,
      source: row.source,
      external_id: row.external_id,
      status: row.status,
      score: row.score,
      current_season: row.current_season,
      last_episode_watched: row.last_episode_watched,
      progress_current: row.progress_current,
      progress_total: row.progress_total,
      owned: row.owned,
      started_at: row.started_at,
      completed_at: row.completed_at,
      image_url: row.image_url,
      catalog_updated_at: null,
    },
    deletedAt,
  );
  const filename = libraryMarkdownFilename(row.title, row.id);
  const path = await join(libraryDir, filename);
  await writeTextFile(path, content);
}
