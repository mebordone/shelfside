import type { SqlDb } from "./catalog";

export type StatusCount = { status: string; n: number };
export type MediaTypeCount = { media_type: string; n: number };

export async function countByStatus(db: SqlDb): Promise<StatusCount[]> {
  return db.select<StatusCount[]>(
    `SELECT status, COUNT(*) AS n FROM library_entry GROUP BY status ORDER BY n DESC`,
  );
}

export async function countByMediaType(db: SqlDb): Promise<MediaTypeCount[]> {
  return db.select<MediaTypeCount[]>(
    `SELECT c.media_type, COUNT(*) AS n
     FROM library_entry le
     INNER JOIN catalog_item c ON c.id = le.catalog_item_id
     GROUP BY c.media_type
     ORDER BY n DESC`,
  );
}

export async function countLibraryEntries(db: SqlDb): Promise<number> {
  const rows = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM library_entry");
  return rows[0]?.n ?? 0;
}
