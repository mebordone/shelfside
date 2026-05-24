import { findCatalogBySource, insertCatalogItem, type InsertCatalogInput, type SqlDb } from "./catalog";
import { mergeStatusTimestamps, normalizeScore } from "./libraryRules";
import { removePosterFile } from "$lib/poster";
import type { LibraryListRow, Status } from "./types";
import { isStatus } from "./types";

/** Referencia TMDB (mismo criterio que en catálogo: source tmdb + external_id + media_type). */
export type TmdbHitRef = {
  mediaType: "movie" | "tv";
  id: number;
};

/**
 * Para cada hit TMDB, devuelve el `id` de `library_entry` si ya está en la biblioteca, o `null`.
 * Clave del mapa: `${mediaType}-${id}` (id numérico como en TMDB).
 */
export async function getTmdbHitsLibraryPresence(db: SqlDb, hits: TmdbHitRef[]): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (hits.length === 0) return map;

  for (const h of hits) {
    map.set(`${h.mediaType}-${h.id}`, null);
  }

  const tuplePlaceholders = hits.map((_, i) => `$${i + 1}`).join(", ");
  const tupleArgs = hits.map((h) => `${String(h.id)}:${h.mediaType}`);

  const rows = await db.select<{ media_type: string; external_id: string; library_id: number }[]>(
    `SELECT ci.media_type, ci.external_id, le.id AS library_id
     FROM catalog_item ci
     INNER JOIN library_entry le ON le.catalog_item_id = ci.id
     WHERE ci.source = 'tmdb'
       AND (ci.external_id || ':' || ci.media_type) IN (${tuplePlaceholders})`,
    tupleArgs,
  );

  for (const row of rows) {
    const key = `${row.media_type}-${String(row.external_id)}`;
    map.set(key, row.library_id);
  }

  return map;
}

/** Referencia Open Library: edición (OLID) en catálogo. */
export type OpenLibraryHitRef = {
  editionId: string;
};

/**
 * Para cada hit OL, devuelve el `id` de `library_entry` si ya está en la biblioteca, o `null`.
 * Clave del mapa: editionId (ej. OL123M).
 */
export async function getOpenLibraryHitsLibraryPresence(
  db: SqlDb,
  hits: OpenLibraryHitRef[],
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (hits.length === 0) return map;

  for (const h of hits) {
    map.set(h.editionId, null);
  }

  const tuplePlaceholders = hits.map((_, i) => `$${i + 1}`).join(", ");
  const tupleArgs = hits.map((h) => h.editionId);

  const rows = await db.select<{ external_id: string; library_id: number }[]>(
    `SELECT ci.external_id, le.id AS library_id
     FROM catalog_item ci
     INNER JOIN library_entry le ON le.catalog_item_id = ci.id
     WHERE ci.source = 'openlibrary'
       AND ci.media_type = 'book'
       AND ci.external_id IN (${tuplePlaceholders})`,
    tupleArgs,
  );

  for (const row of rows) {
    map.set(row.external_id, row.library_id);
  }

  return map;
}

export type LibraryFilters = {
  mediaType?: string;
  status?: string;
  search?: string;
};

/** Ítems por página en el listado de biblioteca. */
export const LIBRARY_LIST_PAGE_SIZE = 20;

export type LibraryListPage = {
  rows: LibraryListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const LIBRARY_LIST_SELECT = `
  SELECT le.id, le.catalog_item_id, le.status, le.score, le.current_season, le.last_episode_watched,
         le.progress_current, le.progress_total, le.owned, le.started_at, le.completed_at, le.notes, le.updated_at,
         ci.media_type, ci.source, ci.external_id, ci.title, ci.image_url, ci.poster_local_path, ci.metadata_json
  FROM library_entry le
  JOIN catalog_item ci ON ci.id = le.catalog_item_id`;

function escapeLikeFragment(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function buildLibraryWhere(filters: LibraryFilters): { whereSql: string; args: unknown[]; nextParam: number } {
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
    n += 1;
  }

  return { whereSql: where.join(" AND "), args, nextParam: n };
}

export async function countLibraryWithCatalog(db: SqlDb, filters: LibraryFilters): Promise<number> {
  const { whereSql, args } = buildLibraryWhere(filters);
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) AS c
     FROM library_entry le
     JOIN catalog_item ci ON ci.id = le.catalog_item_id
     WHERE ${whereSql}`,
    args,
  );
  return Number(rows[0]?.c ?? 0);
}

export async function listLibraryWithCatalog(db: SqlDb, filters: LibraryFilters): Promise<LibraryListRow[]> {
  const { whereSql, args } = buildLibraryWhere(filters);
  const sql = `${LIBRARY_LIST_SELECT}
    WHERE ${whereSql}
    ORDER BY le.updated_at DESC`;
  return db.select<LibraryListRow[]>(sql, args);
}

export async function listLibraryWithCatalogPage(
  db: SqlDb,
  filters: LibraryFilters,
  page: number,
): Promise<LibraryListPage> {
  const pageSize = LIBRARY_LIST_PAGE_SIZE;
  const { whereSql, args, nextParam } = buildLibraryWhere(filters);
  const total = await countLibraryWithCatalog(db, filters);
  const limitIdx = nextParam;
  const offsetIdx = nextParam + 1;
  const sql = `${LIBRARY_LIST_SELECT}
    WHERE ${whereSql}
    ORDER BY le.updated_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const rows = await db.select<LibraryListRow[]>(sql, [...args, pageSize, page * pageSize]);
  return { rows, total, page, pageSize };
}

export async function getLibraryEntryById(db: SqlDb, libraryId: number): Promise<LibraryListRow | null> {
  const rows = await db.select<LibraryListRow[]>(
    `SELECT le.id, le.catalog_item_id, le.status, le.score, le.current_season, le.last_episode_watched,
            le.progress_current, le.progress_total, le.owned, le.started_at, le.completed_at, le.notes, le.updated_at,
            ci.media_type, ci.source, ci.external_id, ci.title, ci.image_url, ci.poster_local_path, ci.metadata_json
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
  overrides?: { notes?: string | null; status?: Status },
): Promise<number> {
  const raw = overrides?.status ?? "planning";
  if (!isStatus(raw)) throw new Error("Estado no válido.");
  const status = raw;
  const nowIso = new Date().toISOString();
  const { started_at, completed_at } = mergeStatusTimestamps(
    "planning",
    status,
    { started_at: null, completed_at: null },
    nowIso,
  );
  const res = await db.execute(
    `INSERT INTO library_entry (catalog_item_id, status, notes, started_at, completed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, datetime('now'))`,
    [catalogItemId, status, overrides?.notes ?? null, started_at, completed_at],
  );
  const id = res.lastInsertId;
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
    throw new Error("insertLibraryEntry: el INSERT no devolvió lastInsertId válido (¿pool SQL?).");
  }
  return id;
}

export type AddManualInput = {
  title: string;
  media_type?: "movie" | "tv" | "book";
  notes?: string | null;
  imageUrl?: string | null;
  posterLocalPath?: string | null;
  metadata_json?: string | null;
  /** Estado inicial de la entrada (por defecto planning). */
  initial_status?: Status;
};

/** Crea catálogo manual (external_id UUID) y fila de biblioteca. */
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
    metadata_json: input.metadata_json ?? null,
  });
  const libraryId = await insertLibraryEntry(db, catalogId, {
    notes: input.notes ?? null,
    status: input.initial_status,
  });
  return { catalogId, libraryId };
}

export type AddTmdbInput = InsertCatalogInput;

export type AddTmdbOptions = {
  initial_status?: Status;
};

type AddCatalogOptions = { initial_status?: Status };

async function addCatalogSourceToLibrary(
  db: SqlDb,
  input: InsertCatalogInput,
  options?: AddCatalogOptions,
): Promise<{ catalogId: number; libraryId: number; alreadyInLibrary: boolean }> {
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

  const libraryId = await insertLibraryEntry(db, catalogId, { status: options?.initial_status });
  return { catalogId, libraryId, alreadyInLibrary: false };
}

/**
 * Inserta o reutiliza catalog_item TMDB y crea library_entry si no existe.
 * Devuelve libraryId y si ya existía en biblioteca (alreadyInLibrary).
 */
export async function addTmdbToLibrary(
  db: SqlDb,
  input: AddTmdbInput,
  options?: AddTmdbOptions,
): Promise<{ catalogId: number; libraryId: number; alreadyInLibrary: boolean }> {
  return addCatalogSourceToLibrary(db, input, options);
}

export type AddOpenLibraryInput = InsertCatalogInput;
/** Inserta o reutiliza catalog_item Open Library (edición) y crea library_entry si no existe. */
export async function addOpenLibraryToLibrary(
  db: SqlDb,
  input: AddOpenLibraryInput,
  options?: AddCatalogOptions,
): Promise<{ catalogId: number; libraryId: number; alreadyInLibrary: boolean }> {
  return addCatalogSourceToLibrary(db, input, options);
}

export type UpdateLibraryInput = {
  status?: Status;
  score?: number | null;
  notes?: string | null;
  current_season?: number | null;
  last_episode_watched?: number | null;
};

/**
 * Quita un ítem de la biblioteca y su fila de catálogo local (1:1).
 * Borra el poster en disco si existía.
 */
export async function deleteLibraryEntry(db: SqlDb, libraryId: number): Promise<void> {
  const row = await getLibraryEntryById(db, libraryId);
  if (!row) throw new Error("Entrada de biblioteca no encontrada.");

  const catalogId = row.catalog_item_id;
  const posterPath = row.poster_local_path;

  await db.execute("DELETE FROM library_entry WHERE id = $1", [libraryId]);
  await db.execute("DELETE FROM catalog_item WHERE id = $1", [catalogId]);
  await removePosterFile(posterPath);
}

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
