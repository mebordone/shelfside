import { findCatalogBySource, insertCatalogItem, type InsertCatalogInput, type SqlDb } from "./catalog";
import { mergeStatusTimestamps, normalizeScore } from "./libraryRules";
import type { LibraryListRow, Status } from "./types";
import { isStatus } from "./types";

export type LibraryFilters = {
  mediaType?: string;
  status?: string;
  search?: string;
};

function escapeLikeFragment(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function listLibraryWithCatalog(db: SqlDb, filters: LibraryFilters): Promise<LibraryListRow[]> {
  const where: string[] = ["1=1"];
  const args: unknown[] = [];
  let n = 1;

  if (filters.mediaType) {
    where.push(`ci.media_type = $${n}`);
    args.push(filters.mediaType);
    n += 1;
  }

  if (filters.status) {
    where.push(`le.status = $${n}`);
    args.push(filters.status);
    n += 1;
  }

  if (filters.search?.trim()) {
    const esc = escapeLikeFragment(filters.search.trim());
    where.push(`ci.title LIKE $${n} ESCAPE '\\'`);
    args.push(`%${esc}%`);
  }

  const sql = `
    SELECT le.id, le.catalog_item_id, le.status, le.score, le.current_season, le.last_episode_watched,
           le.progress_current, le.progress_total, le.owned, le.started_at, le.completed_at, le.notes, le.updated_at,
           ci.media_type, ci.source, ci.external_id, ci.title, ci.image_url, ci.poster_local_path
    FROM library_entry le
    JOIN catalog_item ci ON ci.id = le.catalog_item_id
    WHERE ${where.join(" AND ")}
    ORDER BY le.updated_at DESC
  `;

  return db.select<LibraryListRow[]>(sql, args);
}

export async function getLibraryEntryById(db: SqlDb, libraryId: number): Promise<LibraryListRow | null> {
  const rows = await db.select<LibraryListRow[]>(
    `SELECT le.id, le.catalog_item_id, le.status, le.score, le.current_season, le.last_episode_watched,
            le.progress_current, le.progress_total, le.owned, le.started_at, le.completed_at, le.notes, le.updated_at,
            ci.media_type, ci.source, ci.external_id, ci.title, ci.image_url, ci.poster_local_path
     FROM library_entry le
     JOIN catalog_item ci ON ci.id = le.catalog_item_id
     WHERE le.id = $1`,
    [libraryId],
  );
  return rows[0] ?? null;
}

export async function getLibraryIdForCatalog(db: SqlDb, catalogItemId: number): Promise<number | null> {
  const rows = await db.select<{ id: number }[]>(
    "SELECT id FROM library_entry WHERE catalog_item_id = $1",
    [catalogItemId],
  );
  return rows[0]?.id ?? null;
}

export async function insertLibraryEntry(
  db: SqlDb,
  catalogItemId: number,
  overrides?: { notes?: string | null },
): Promise<number> {
  await db.execute(
    `INSERT INTO library_entry (catalog_item_id, status, notes, updated_at)
     VALUES ($1, 'planning', $2, datetime('now'))`,
    [catalogItemId, overrides?.notes ?? null],
  );
  const rows = await db.select<{ id: number }[]>("SELECT last_insert_rowid() as id");
  return Number(rows[0]?.id ?? 0);
}

export type AddManualInput = {
  title: string;
  media_type?: "movie" | "tv";
  notes?: string | null;
  imageUrl?: string | null;
  posterLocalPath?: string | null;
};

/** Crea catálogo manual (external_id UUID) y fila de biblioteca en estado planning. */
export async function addManualToLibrary(db: SqlDb, input: AddManualInput): Promise<{ catalogId: number; libraryId: number }> {
  const external_id = crypto.randomUUID();
  const mediaType = input.media_type ?? "movie";
  const catalogId = await insertCatalogItem(db, {
    media_type: mediaType,
    source: "manual",
    external_id,
    title: input.title.trim(),
    image_url: input.imageUrl ?? null,
    poster_local_path: input.posterLocalPath ?? null,
  });
  const libraryId = await insertLibraryEntry(db, catalogId, { notes: input.notes ?? null });
  return { catalogId, libraryId };
}

export type AddTmdbInput = InsertCatalogInput;

/**
 * Inserta o reutiliza catalog_item TMDB y crea library_entry si no existe.
 * Devuelve libraryId y si ya existía en biblioteca (alreadyInLibrary).
 */
export async function addTmdbToLibrary(db: SqlDb, input: AddTmdbInput): Promise<{
  catalogId: number;
  libraryId: number;
  alreadyInLibrary: boolean;
}> {
  const existing = await findCatalogBySource(db, input.source, input.external_id, input.media_type);
  let catalogId: number;

  if (existing) {
    catalogId = existing.id;
    const existingLib = await getLibraryIdForCatalog(db, catalogId);
    if (existingLib !== null) {
      return { catalogId, libraryId: existingLib, alreadyInLibrary: true };
    }
  } else {
    catalogId = await insertCatalogItem(db, input);
  }

  const libraryId = await insertLibraryEntry(db, catalogId);
  return { catalogId, libraryId, alreadyInLibrary: false };
}

export type UpdateLibraryInput = {
  status?: Status;
  score?: number | null;
  notes?: string | null;
  current_season?: number | null;
  last_episode_watched?: number | null;
};

export async function updateLibraryEntry(db: SqlDb, libraryId: number, patch: UpdateLibraryInput): Promise<void> {
  const row = await getLibraryEntryById(db, libraryId);
  if (!row) throw new Error("Entrada de biblioteca no encontrada.");

  const nowIso = new Date().toISOString();
  let status = row.status;
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error("Estado no válido.");
    status = patch.status;
  }

  const { started_at, completed_at } = mergeStatusTimestamps(
    row.status,
    status as Status,
    { started_at: row.started_at, completed_at: row.completed_at },
    nowIso,
  );

  let score = row.score;
  if (patch.score !== undefined) {
    score = normalizeScore(patch.score);
  }

  const notes = patch.notes !== undefined ? patch.notes : row.notes;
  const current_season = patch.current_season !== undefined ? patch.current_season : row.current_season;
  const last_episode_watched =
    patch.last_episode_watched !== undefined ? patch.last_episode_watched : row.last_episode_watched;

  await db.execute(
    `UPDATE library_entry SET
       status = $1,
       score = $2,
       notes = $3,
       current_season = $4,
       last_episode_watched = $5,
       started_at = $6,
       completed_at = $7,
       updated_at = datetime('now')
     WHERE id = $8`,
    [status, score, notes, current_season, last_episode_watched, started_at, completed_at, libraryId],
  );
}
