import { join } from "@tauri-apps/api/path";
import { readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { parseMarkdownEntry } from "./parseMarkdown";
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

async function scanTombstones(
  db: SqlDb,
  syncDir: string,
): Promise<
  | { ok: false; errors: string[] }
  | { ok: true; toRemove: string[]; skipped: number; errors: string[] }
> {
  const libraryDir = await join(syncDir, "library");
  const errors: string[] = [];
  const toRemove: string[] = [];
  let skipped = 0;

  let entries;
  try {
    entries = await readDir(libraryDir);
  } catch (e) {
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }

  for (const ent of entries) {
    if (!ent.name?.endsWith(".md")) continue;
    const filePath = await join(libraryDir, ent.name);
    try {
      const text = await readTextFile(filePath);
      const parsed = parseMarkdownEntry(text);
      if (!parsed.deleted) continue;

      const local = await resolveLocalEntry(db, parsed);
      if (local) {
        skipped += 1;
        continue;
      }
      toRemove.push(filePath);
    } catch (e) {
      errors.push(`${ent.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { ok: true, toRemove, skipped, errors };
}

export async function previewCleanSyncRecycleBin(
  db: SqlDb,
  syncDir: string,
): Promise<CleanRecyclePreview> {
  const scan = await scanTombstones(db, syncDir);
  if (!scan.ok) return { eligible: 0, skipped: 0, errors: scan.errors };
  return { eligible: scan.toRemove.length, skipped: scan.skipped, errors: scan.errors };
}

export async function cleanSyncRecycleBin(db: SqlDb, syncDir: string): Promise<CleanRecycleResult> {
  const scan = await scanTombstones(db, syncDir);
  if (!scan.ok) return { removed: 0, skipped: 0, errors: scan.errors };

  let removed = 0;
  for (const filePath of scan.toRemove) {
    try {
      await remove(filePath);
      removed += 1;
    } catch (e) {
      scan.errors.push(`${filePath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { removed, skipped: scan.skipped, errors: scan.errors };
}
