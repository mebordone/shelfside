import { describe, expect, it } from "vitest";
import {
  parseSyncCsv,
  serializeSyncCsv,
  SYNC_CSV_COLUMNS,
  upsertSyncCsvRow,
  type SyncCsvRow,
} from "./parseCsv";

function sampleLive(overrides: Partial<SyncCsvRow> = {}): SyncCsvRow {
  return {
    shelfside_id: 42,
    updated_at: "2026-06-01T00:00:00.000Z",
    deleted: false,
    deleted_at: null,
    title: "Dune",
    media_type: "movie",
    source: "tmdb",
    external_id: "1",
    status: "planning",
    score: null,
    current_season: null,
    last_episode_watched: null,
    progress_current: null,
    progress_total: null,
    owned: null,
    started_at: null,
    completed_at: null,
    image_url: null,
    catalog_updated_at: null,
    notes: "",
    ...overrides,
  };
}

describe("parseCsv / serializeSyncCsv", () => {
  it("roundtrip preserva notas multilínea y campos", () => {
    const row = sampleLive({
      notes: "línea 1\nlínea 2, con coma",
      title: 'Título "X"',
      score: 8,
    });
    const text = serializeSyncCsv([row]);
    expect(text.startsWith(SYNC_CSV_COLUMNS.join(","))).toBe(true);
    const parsed = parseSyncCsv(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.notes).toBe("línea 1\nlínea 2, con coma");
    expect(parsed[0]!.title).toBe('Título "X"');
    expect(parsed[0]!.score).toBe(8);
    expect(parsed[0]!.deleted).toBe(false);
  });

  it("parsea tombstone deleted", () => {
    const row = sampleLive({
      deleted: true,
      deleted_at: "2026-12-01T00:00:00.000Z",
      updated_at: "2026-12-01T00:00:00.000Z",
    });
    const parsed = parseSyncCsv(serializeSyncCsv([row]));
    expect(parsed[0]!.deleted).toBe(true);
    expect(parsed[0]!.deleted_at).toBe("2026-12-01T00:00:00.000Z");
  });

  it("upsert reemplaza por clave de catálogo", () => {
    const a = sampleLive({ title: "Old" });
    const b = sampleLive({ title: "New", notes: "x" });
    const out = upsertSyncCsvRow([a], b);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("New");
  });
});
