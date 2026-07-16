import type { ParsedMarkdownEntry } from "./parseMarkdown";

/** Misma forma que ParsedMarkdownEntry: reutiliza resolveLocalEntry / LWW. */
export type SyncCsvRow = ParsedMarkdownEntry;

export const SYNC_CSV_COLUMNS = [
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

export type SyncCsvColumn = (typeof SYNC_CSV_COLUMNS)[number];

export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Parsea un CSV con campos entrecomillados (soporta comas y saltos de línea en notas). */
export function parseCsvRecords(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < content.length) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseOptionalInt(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalString(raw: string | undefined): string | null {
  if (raw === undefined || raw === "") return null;
  return raw;
}

function parseOptionalBool(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

function catalogKey(row: Pick<SyncCsvRow, "source" | "external_id" | "media_type">): string {
  return `${row.source}\0${row.external_id}\0${row.media_type}`;
}

export function syncCsvCatalogKey(row: Pick<SyncCsvRow, "source" | "external_id" | "media_type">): string {
  return catalogKey(row);
}

export function parseSyncCsvRow(header: string[], cells: string[]): SyncCsvRow {
  const map: Record<string, string> = {};
  for (let i = 0; i < header.length; i += 1) {
    map[header[i]!] = cells[i] ?? "";
  }

  const shelfsideId = parseOptionalInt(map.shelfside_id);
  if (shelfsideId === null || shelfsideId <= 0) throw new Error("shelfside_id inválido.");

  const updatedAt = parseOptionalString(map.library_updated_at) ?? parseOptionalString(map.updated_at);
  if (!updatedAt) throw new Error("library_updated_at obligatorio.");

  const title = map.title?.trim();
  const mediaType = map.media_type?.trim();
  const source = map.source?.trim();
  const externalId = map.external_id?.trim();
  const status = map.status?.trim();
  if (!title || !mediaType || !source || !externalId || !status) {
    throw new Error("Campos obligatorios faltantes en fila CSV.");
  }

  const deleted = parseOptionalBool(map.deleted);
  const deletedAt = parseOptionalString(map.deleted_at);

  return {
    shelfside_id: shelfsideId,
    updated_at: updatedAt,
    deleted,
    deleted_at: deleted && !deletedAt ? updatedAt : deletedAt,
    title,
    media_type: mediaType,
    source,
    external_id: externalId,
    status,
    score: parseOptionalInt(map.score),
    current_season: parseOptionalInt(map.current_season),
    last_episode_watched: parseOptionalInt(map.last_episode_watched),
    progress_current: parseOptionalInt(map.progress_current),
    progress_total: parseOptionalInt(map.progress_total),
    owned: parseOptionalInt(map.owned),
    started_at: parseOptionalString(map.started_at),
    completed_at: parseOptionalString(map.completed_at),
    image_url: parseOptionalString(map.image_url),
    catalog_updated_at: parseOptionalString(map.catalog_updated_at),
    notes: map.notes ?? "",
  };
}

export function parseSyncCsv(content: string): SyncCsvRow[] {
  const records = parseCsvRecords(content.trim());
  if (records.length === 0) return [];
  const header = records[0]!.map((h) => h.trim());
  const rows: SyncCsvRow[] = [];
  for (let i = 1; i < records.length; i += 1) {
    rows.push(parseSyncCsvRow(header, records[i]!));
  }
  return rows;
}

export function serializeSyncCsvRow(row: SyncCsvRow): string {
  const fields = [
    row.shelfside_id,
    row.title,
    row.media_type,
    row.source,
    row.external_id,
    row.status,
    row.score,
    row.current_season,
    row.last_episode_watched,
    row.progress_current,
    row.progress_total,
    row.owned,
    row.started_at,
    row.completed_at,
    row.notes,
    row.image_url,
    row.catalog_updated_at,
    row.updated_at,
    row.deleted ? "true" : "false",
    row.deleted_at,
  ];
  return fields.map(escapeCsvField).join(",");
}

export function serializeSyncCsv(rows: SyncCsvRow[]): string {
  const header = SYNC_CSV_COLUMNS.join(",");
  if (rows.length === 0) return `${header}\n`;
  return [header, ...rows.map(serializeSyncCsvRow)].join("\n") + "\n";
}

export function upsertSyncCsvRow(rows: SyncCsvRow[], next: SyncCsvRow): SyncCsvRow[] {
  const key = catalogKey(next);
  const out = rows.filter((r) => catalogKey(r) !== key);
  out.push(next);
  return out;
}
