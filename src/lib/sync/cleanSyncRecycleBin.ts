import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { syncCsvPath } from "./csvPath";
import { readExistingSyncCsv } from "./mergeFromCsv";
import { serializeSyncCsv, type SyncCsvRow } from "./parseCsv";
import { resolveLocalEntry } from "./resolveLocalEntry";

export type CleanRecycleResult = {
  removed: number;
  skipped: number;
  errors: string[];
};

export type CleanRecyclePreview = {
  eligible: number;
  skipped: number;
  errors: string[];
};

async function partitionTombstones(
  db: SqlDb,
  syncDir: string,
): Promise<
  | { ok: false; errors: string[] }
  | { ok: true; keep: SyncCsvRow[]; removeCount: number; skipped: number; errors: string[] }
> {
  const errors: string[] = [];
  let rows: SyncCsvRow[];
  try {
    rows = await readExistingSyncCsv(syncDir);
  } catch (e) {
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }

  const keep: SyncCsvRow[] = [];
  let removeCount = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.deleted) {
      keep.push(row);
      continue;
    }
    try {
      const local = await resolveLocalEntry(db, row);
      if (local) {
        skipped += 1;
        keep.push(row);
        continue;
      }
      removeCount += 1;
    } catch (e) {
      errors.push(
        `${row.source}/${row.external_id}: ${e instanceof Error ? e.message : String(e)}`,
      );
      keep.push(row);
    }
  }

  return { ok: true, keep, removeCount, skipped, errors };
}

export async function previewCleanSyncRecycleBin(
  db: SqlDb,
  syncDir: string,
): Promise<CleanRecyclePreview> {
  const scan = await partitionTombstones(db, syncDir);
  if (!scan.ok) return { eligible: 0, skipped: 0, errors: scan.errors };
  return { eligible: scan.removeCount, skipped: scan.skipped, errors: scan.errors };
}

export async function cleanSyncRecycleBin(db: SqlDb, syncDir: string): Promise<CleanRecycleResult> {
  const scan = await partitionTombstones(db, syncDir);
  if (!scan.ok) return { removed: 0, skipped: 0, errors: scan.errors };

  if (scan.removeCount === 0) {
    return { removed: 0, skipped: scan.skipped, errors: scan.errors };
  }

  try {
    const path = await syncCsvPath(syncDir);
    await writeTextFile(path, serializeSyncCsv(scan.keep));
  } catch (e) {
    scan.errors.push(e instanceof Error ? e.message : String(e));
    return { removed: 0, skipped: scan.skipped, errors: scan.errors };
  }

  return { removed: scan.removeCount, skipped: scan.skipped, errors: scan.errors };
}
