import type { CatalogItemRow } from "./types";

/** Resultado de `execute` del plugin SQL (SQLite expone `lastInsertId`). */
export type SqlExecuteResult = {
  rowsAffected?: number;
  lastInsertId?: number;
};

export type SqlDb = {
  select<T>(query: string, bind?: unknown[]): Promise<T>;
  execute(query: string, bind?: unknown[]): Promise<SqlExecuteResult>;
};

export type InsertCatalogInput = {
  media_type: string;
  source: string;
  external_id: string;
  title: string;
  image_url: string | null;
  poster_local_path?: string | null;
  metadata_json?: string | null;
};

export async function findCatalogBySource(
  db: SqlDb,
  source: string,
  externalId: string,
  mediaType: string,
): Promise<CatalogItemRow | null> {
  const rows = await db.select<CatalogItemRow[]>(
    `SELECT id, media_type, source, external_id, title, image_url, poster_local_path,
            season_number, episode_number, parent_catalog_id, metadata_json, created_at, updated_at
     FROM catalog_item WHERE source = $1 AND external_id = $2 AND media_type = $3`,
    [source, externalId, mediaType],
  );
  return rows[0] ?? null;
}

export async function getCatalogById(db: SqlDb, id: number): Promise<CatalogItemRow | null> {
  const rows = await db.select<CatalogItemRow[]>(
    `SELECT id, media_type, source, external_id, title, image_url, poster_local_path,
            season_number, episode_number, parent_catalog_id, metadata_json, created_at, updated_at
     FROM catalog_item WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertCatalogItem(db: SqlDb, input: InsertCatalogInput): Promise<number> {
  const res = await db.execute(
    `INSERT INTO catalog_item (
       media_type, source, external_id, title, image_url, poster_local_path, metadata_json, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'))`,
    [
      input.media_type,
      input.source,
      input.external_id,
      input.title,
      input.image_url,
      input.poster_local_path ?? null,
      input.metadata_json ?? null,
    ],
  );
  const id = res.lastInsertId;
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
    throw new Error("insertCatalogItem: el INSERT no devolvió lastInsertId válido (¿pool SQL?).");
  }
  return id;
}

export async function updateCatalogItem(
  db: SqlDb,
  id: number,
  patch: {
    title?: string;
    image_url?: string | null;
    poster_local_path?: string | null;
    metadata_json?: string | null;
  },
): Promise<void> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const args: unknown[] = [];
  let i = 1;

  if (patch.title !== undefined) {
    sets.push(`title = $${i}`);
    args.push(patch.title);
    i += 1;
  }
  if (patch.image_url !== undefined) {
    sets.push(`image_url = $${i}`);
    args.push(patch.image_url);
    i += 1;
  }
  if (patch.poster_local_path !== undefined) {
    sets.push(`poster_local_path = $${i}`);
    args.push(patch.poster_local_path);
    i += 1;
  }
  if (patch.metadata_json !== undefined) {
    sets.push(`metadata_json = $${i}`);
    args.push(patch.metadata_json);
    i += 1;
  }

  args.push(id);
  await db.execute(`UPDATE catalog_item SET ${sets.join(", ")} WHERE id = $${i}`, args);
}

/**
 * Setea solo la ruta local del poster SIN bumpear `updated_at`.
 * El poster local es un dato específico del dispositivo (no viaja en el CSV),
 * así que persistirlo no debe afectar `catalog_updated_at` ni disparar re-sync.
 */
export async function setPosterLocalPath(
  db: SqlDb,
  id: number,
  posterLocalPath: string | null,
): Promise<void> {
  await db.execute(`UPDATE catalog_item SET poster_local_path = $1 WHERE id = $2`, [
    posterLocalPath,
    id,
  ]);
}
