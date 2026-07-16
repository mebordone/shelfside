import type { SqlDb } from "$lib/db/catalog";
import { listLibraryWithCatalog } from "$lib/db/library";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const CSV_COLUMNS = [
  "shelfside_id",
  "title",
  "media_type",
  "source",
  "external_id",
  "status",
  "score",
  "current_season",
  "last_episode_watched",
  "progress_current",
  "progress_total",
  "owned",
  "started_at",
  "completed_at",
  "notes",
  "image_url",
  "catalog_updated_at",
  "library_updated_at",
  "deleted",
  "deleted_at",
] as const;

export async function buildLibraryCsv(db: SqlDb): Promise<string> {
  const rows = await listLibraryWithCatalog(db, {});
  const catalogRows = await db.select<{ id: number; updated_at: string }[]>(
    "SELECT id, updated_at FROM catalog_item",
  );
  const catalogMap = new Map(catalogRows.map((c) => [c.id, c.updated_at]));

  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((r) => {
    const fields = [
      r.id,
      r.title,
      r.media_type,
      r.source,
      r.external_id,
      r.status,
      r.score,
      r.current_season,
      r.last_episode_watched,
      r.progress_current,
      r.progress_total,
      r.owned,
      r.started_at,
      r.completed_at,
      r.notes,
      r.image_url,
      catalogMap.get(r.catalog_item_id) ?? "",
      r.updated_at,
      "false",
      "",
    ];
    return fields.map(escapeCsvField).join(",");
  });
  return [header, ...lines].join("\n");
}
