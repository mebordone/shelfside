export type ParsedMarkdownEntry = {
  shelfside_id: number;
  updated_at: string;
  deleted: boolean;
  deleted_at: string | null;
  title: string;
  media_type: string;
  source: string;
  external_id: string;
  status: string;
  score: number | null;
  current_season: number | null;
  last_episode_watched: number | null;
  progress_current: number | null;
  progress_total: number | null;
  owned: number | null;
  started_at: string | null;
  completed_at: string | null;
  image_url: string | null;
  catalog_updated_at: string | null;
  notes: string;
};

function parseYamlValue(raw: string): string {
  const t = raw.trim();
  if (t === "null" || t === "~") return "";
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseOptionalInt(raw: string | undefined): number | null {
  if (raw === undefined || raw === "" || raw === "null") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalString(raw: string | undefined): string | null {
  if (raw === undefined || raw === "" || raw === "null") return null;
  return parseYamlValue(raw);
}

function parseOptionalBool(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const v = parseYamlValue(raw).toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

/** Timestamp LWW para tombstones (`deleted_at` o `updated_at`). */
export function effectiveRemoteTime(remote: ParsedMarkdownEntry): string {
  if (remote.deleted) return remote.deleted_at ?? remote.updated_at;
  return remote.updated_at;
}

function requireYamlField(fm: Record<string, string>, key: string): string {
  const v = parseYamlValue(fm[key] ?? "");
  if (!v) throw new Error(`${key} obligatorio.`);
  return v;
}

export function splitFrontmatter(content: string): { yaml: string; body: string } | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return null;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return null;
  const yaml = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\n/, "");
  return { yaml, body };
}

export function parseFrontmatterYaml(yaml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    out[key] = trimmed.slice(colon + 1).trim();
  }
  return out;
}

export function parseMarkdownEntry(content: string): ParsedMarkdownEntry {
  const split = splitFrontmatter(content);
  if (!split) throw new Error("Markdown sin frontmatter YAML.");

  const fm = parseFrontmatterYaml(split.yaml);
  const shelfsideId = parseOptionalInt(fm.shelfside_id);
  if (shelfsideId === null || shelfsideId <= 0) throw new Error("shelfside_id inválido.");

  const updatedAt = parseOptionalString(fm.updated_at);
  if (!updatedAt) throw new Error("updated_at obligatorio.");

  const deleted = parseOptionalBool(fm.deleted);
  const deletedAt = parseOptionalString(fm.deleted_at);

  return {
    shelfside_id: shelfsideId,
    updated_at: updatedAt,
    deleted,
    deleted_at: deleted && !deletedAt ? updatedAt : deletedAt,
    title: requireYamlField(fm, "title"),
    media_type: requireYamlField(fm, "media_type"),
    source: requireYamlField(fm, "source"),
    external_id: requireYamlField(fm, "external_id"),
    status: requireYamlField(fm, "status"),
    score: parseOptionalInt(fm.score),
    current_season: parseOptionalInt(fm.current_season),
    last_episode_watched: parseOptionalInt(fm.last_episode_watched),
    progress_current: parseOptionalInt(fm.progress_current),
    progress_total: parseOptionalInt(fm.progress_total),
    owned: parseOptionalInt(fm.owned),
    started_at: parseOptionalString(fm.started_at),
    completed_at: parseOptionalString(fm.completed_at),
    image_url: parseOptionalString(fm.image_url),
    catalog_updated_at: parseOptionalString(fm.catalog_updated_at),
    notes: split.body.trim(),
  };
}

function yamlLine(key: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return `${key}: null`;
  if (typeof value === "boolean") return `${key}: ${value}`;
  if (typeof value === "number") return `${key}: ${value}`;
  const escaped = String(value).replace(/"/g, '\\"');
  return `${key}: "${escaped}"`;
}

export function serializeMarkdownEntry(row: {
  id: number;
  updated_at: string;
  title: string;
  media_type: string;
  source: string;
  external_id: string;
  status: string;
  score: number | null;
  current_season: number | null;
  last_episode_watched: number | null;
  progress_current: number | null;
  progress_total: number | null;
  owned: number | null;
  started_at: string | null;
  completed_at: string | null;
  image_url: string | null;
  catalog_updated_at: string | null;
  notes: string | null;
}): string {
  const fm = [
    yamlLine("shelfside_id", row.id),
    yamlLine("updated_at", row.updated_at),
    yamlLine("title", row.title),
    yamlLine("media_type", row.media_type),
    yamlLine("source", row.source),
    yamlLine("external_id", row.external_id),
    yamlLine("status", row.status),
    yamlLine("score", row.score),
    yamlLine("current_season", row.current_season),
    yamlLine("last_episode_watched", row.last_episode_watched),
    yamlLine("progress_current", row.progress_current),
    yamlLine("progress_total", row.progress_total),
    yamlLine("owned", row.owned),
    yamlLine("started_at", row.started_at),
    yamlLine("completed_at", row.completed_at),
    yamlLine("image_url", row.image_url),
    yamlLine("catalog_updated_at", row.catalog_updated_at),
  ].join("\n");

  const body = row.notes?.trim() ?? "";
  const tail = body.length > 0 ? `${body}\n` : "";
  return `---\n${fm}\n---\n${tail}`;
}

export type TombstoneRow = {
  id: number;
  updated_at: string;
  title: string;
  media_type: string;
  source: string;
  external_id: string;
  status: string;
  score: number | null;
  current_season: number | null;
  last_episode_watched: number | null;
  progress_current: number | null;
  progress_total: number | null;
  owned: number | null;
  started_at: string | null;
  completed_at: string | null;
  image_url: string | null;
  catalog_updated_at: string | null;
};

export function serializeTombstoneEntry(row: TombstoneRow, deletedAt: string): string {
  const fm = [
    yamlLine("shelfside_id", row.id),
    yamlLine("deleted", true),
    yamlLine("deleted_at", deletedAt),
    yamlLine("updated_at", deletedAt),
    yamlLine("title", row.title),
    yamlLine("media_type", row.media_type),
    yamlLine("source", row.source),
    yamlLine("external_id", row.external_id),
    yamlLine("status", row.status),
    yamlLine("score", row.score),
    yamlLine("current_season", row.current_season),
    yamlLine("last_episode_watched", row.last_episode_watched),
    yamlLine("progress_current", row.progress_current),
    yamlLine("progress_total", row.progress_total),
    yamlLine("owned", row.owned),
    yamlLine("started_at", row.started_at),
    yamlLine("completed_at", row.completed_at),
    yamlLine("image_url", row.image_url),
    yamlLine("catalog_updated_at", row.catalog_updated_at),
  ].join("\n");

  return `---\n${fm}\n---\n# removed from library\n`;
}
