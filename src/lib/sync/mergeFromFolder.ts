import { join } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { findCatalogBySource, insertCatalogItem, type SqlDb } from "$lib/db/catalog";
import { getLibraryEntryById, getLibraryIdForCatalog } from "$lib/db/library";
import { isStatus, type LibraryListRow, type Status } from "$lib/db/types";
import { mergeStatusTimestamps, normalizeScore } from "$lib/db/libraryRules";
import { parseMarkdownEntry, type ParsedMarkdownEntry } from "./parseMarkdown";

export type MergeResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function compareUpdatedAt(a: string, b: string): number {
  return a.localeCompare(b);
}

function normalizeNotes(notes: string | null | undefined): string {
  return (notes ?? "").trim();
}

/** True si el .md en disco difiere de lo guardado en SQLite (p. ej. notas editadas a mano). */
function remoteEntryDiffersFromLocal(local: LibraryListRow, remote: ParsedMarkdownEntry): boolean {
  const remoteStatus: string = isStatus(remote.status) ? remote.status : local.status;

  if (remoteStatus !== local.status) return true;
  if (normalizeScore(remote.score) !== normalizeScore(local.score)) return true;
  if (remote.current_season !== local.current_season) return true;
  if (remote.last_episode_watched !== local.last_episode_watched) return true;
  if (remote.progress_current !== local.progress_current) return true;
  if (remote.progress_total !== local.progress_total) return true;
  if ((remote.owned ?? null) !== (local.owned ?? null)) return true;
  if ((remote.started_at ?? null) !== (local.started_at ?? null)) return true;
  if ((remote.completed_at ?? null) !== (local.completed_at ?? null)) return true;
  if (normalizeNotes(remote.notes) !== normalizeNotes(local.notes)) return true;
  if (remote.title !== local.title) return true;
  if ((remote.image_url ?? null) !== (local.image_url ?? null)) return true;

  return false;
}

function shouldApplyRemote(local: LibraryListRow | null, remote: ParsedMarkdownEntry): boolean {
  if (!local) return true;
  if (compareUpdatedAt(remote.updated_at, local.updated_at) > 0) return true;
  if (compareUpdatedAt(remote.updated_at, local.updated_at) < 0) return false;
  return remoteEntryDiffersFromLocal(local, remote);
}

/** Entrada local por shelfside_id del .md o por (source, external_id, media_type). */
async function resolveLocalEntry(db: SqlDb, remote: ParsedMarkdownEntry): Promise<LibraryListRow | null> {
  const byId = await getLibraryEntryById(db, remote.shelfside_id);
  if (byId) return byId;

  const catalog = await findCatalogBySource(db, remote.source, remote.external_id, remote.media_type);
  if (!catalog) return null;

  const libraryId = await getLibraryIdForCatalog(db, catalog.id);
  if (libraryId === null) return null;

  return getLibraryEntryById(db, libraryId);
}

async function updateLocalFromRemote(
  db: SqlDb,
  local: LibraryListRow,
  remote: ParsedMarkdownEntry,
): Promise<void> {
  const status: Status = isStatus(remote.status) ? remote.status : (local.status as Status);
  const { started_at, completed_at } = mergeStatusTimestamps(
    local.status as Status,
    status,
    { started_at: local.started_at, completed_at: local.completed_at },
    remote.updated_at,
  );
  await db.execute(
    `UPDATE catalog_item SET title = $1, image_url = $2, updated_at = $3 WHERE id = $4`,
    [remote.title, remote.image_url, remote.catalog_updated_at ?? remote.updated_at, local.catalog_item_id],
  );
  await db.execute(
    `UPDATE library_entry SET
       status = $1, score = $2, notes = $3, current_season = $4, last_episode_watched = $5,
       progress_current = $6, progress_total = $7, owned = $8,
       started_at = $9, completed_at = $10, updated_at = $11
     WHERE id = $12`,
    [
      status,
      normalizeScore(remote.score),
      remote.notes || null,
      remote.current_season,
      remote.last_episode_watched,
      remote.progress_current,
      remote.progress_total,
      remote.owned,
      started_at,
      completed_at,
      remote.updated_at,
      local.id,
    ],
  );
}

async function applyRemoteEntry(
  db: SqlDb,
  remote: ParsedMarkdownEntry,
  local: LibraryListRow | null,
): Promise<"inserted" | "updated"> {
  if (local) {
    await updateLocalFromRemote(db, local, remote);
    return "updated";
  }

  const catalog = await findCatalogBySource(db, remote.source, remote.external_id, remote.media_type);
  let catalogId: number;
  if (catalog) {
    catalogId = catalog.id;
    await db.execute(
      `UPDATE catalog_item SET title = $1, image_url = $2, updated_at = $3 WHERE id = $4`,
      [remote.title, remote.image_url, remote.catalog_updated_at ?? remote.updated_at, catalogId],
    );
  } else {
    catalogId = await insertCatalogItem(db, {
      media_type: remote.media_type,
      source: remote.source,
      external_id: remote.external_id,
      title: remote.title,
      image_url: remote.image_url,
    });
  }

  const status = isStatus(remote.status) ? remote.status : "planning";
  const { started_at, completed_at } = mergeStatusTimestamps(
    "planning",
    status,
    { started_at: null, completed_at: null },
    remote.updated_at,
  );

  await db.execute(
    `INSERT INTO library_entry (
       id, catalog_item_id, status, score, notes, current_season, last_episode_watched,
       progress_current, progress_total, owned, started_at, completed_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      remote.shelfside_id,
      catalogId,
      status,
      normalizeScore(remote.score),
      remote.notes || null,
      remote.current_season,
      remote.last_episode_watched,
      remote.progress_current,
      remote.progress_total,
      remote.owned,
      started_at,
      completed_at,
      remote.updated_at,
    ],
  );
  return "inserted";
}

async function mergeOneFile(db: SqlDb, filePath: string, result: MergeResult): Promise<void> {
  const text = await readTextFile(filePath);
  const parsed = parseMarkdownEntry(text);
  const local = await resolveLocalEntry(db, parsed);
  if (!shouldApplyRemote(local, parsed)) {
    result.skipped += 1;
    return;
  }
  const outcome = await applyRemoteEntry(db, parsed, local);
  if (outcome === "inserted") result.imported += 1;
  else result.updated += 1;
}

export async function mergeFromSyncFolder(db: SqlDb, syncDir: string): Promise<MergeResult> {
  const result: MergeResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const libraryDir = await join(syncDir, "library");

  let entries;
  try {
    entries = await readDir(libraryDir);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }

  for (const ent of entries) {
    if (!ent.name?.endsWith(".md")) continue;
    const filePath = await join(libraryDir, ent.name);
    try {
      await mergeOneFile(db, filePath, result);
    } catch (e) {
      result.errors.push(`${ent.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
