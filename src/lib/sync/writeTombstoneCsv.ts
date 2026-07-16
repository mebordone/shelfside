import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { LibraryListRow } from "$lib/db/types";
import { syncCsvPath } from "./csvPath";
import { readExistingSyncCsv } from "./mergeFromCsv";
import { serializeSyncCsv, upsertSyncCsvRow, type SyncCsvRow } from "./parseCsv";

function tombstoneFromRow(row: LibraryListRow, deletedAt: string): SyncCsvRow {
  return {
    shelfside_id: row.id,
    updated_at: deletedAt,
    deleted: true,
    deleted_at: deletedAt,
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
    notes: "",
  };
}

export async function writeTombstoneToSyncCsv(
  syncDir: string,
  row: LibraryListRow,
  deletedAt: string = new Date().toISOString(),
): Promise<void> {
  const existing = await readExistingSyncCsv(syncDir);
  const next = upsertSyncCsvRow(existing, tombstoneFromRow(row, deletedAt));
  const path = await syncCsvPath(syncDir);
  await writeTextFile(path, serializeSyncCsv(next));
}
