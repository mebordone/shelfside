import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "$lib/db/catalog";
import { listLibraryWithCatalog } from "$lib/db/library";
import { syncCsvPath } from "./csvPath";
import { readExistingSyncCsv } from "./mergeFromCsv";
import {
  serializeSyncCsv,
  syncCsvCatalogKey,
  type SyncCsvRow,
} from "./parseCsv";

async function catalogUpdatedMap(db: SqlDb): Promise<Map<number, string>> {
  const catalogRows = await db.select<{ id: number; updated_at: string }[]>(
    "SELECT id, updated_at FROM catalog_item",
  );
  return new Map(catalogRows.map((c) => [c.id, c.updated_at]));
}

function liveRowFromLibrary(
  r: Awaited<ReturnType<typeof listLibraryWithCatalog>>[number],
  catalogUpdatedAt: string | null,
): SyncCsvRow {
  return {
    shelfside_id: r.id,
    updated_at: r.updated_at,
    deleted: false,
    deleted_at: null,
    title: r.title,
    media_type: r.media_type,
    source: r.source,
    external_id: r.external_id,
    status: r.status,
    score: r.score,
    current_season: r.current_season,
    last_episode_watched: r.last_episode_watched,
    progress_current: r.progress_current,
    progress_total: r.progress_total,
    owned: r.owned,
    started_at: r.started_at,
    completed_at: r.completed_at,
    image_url: r.image_url,
    catalog_updated_at: catalogUpdatedAt,
    notes: r.notes ?? "",
  };
}

export type ExportCsvResult = {
  /** Cantidad de obras vivas exportadas. */
  exported: number;
  /** `true` si el archivo fue reescrito; `false` si el contenido ya estaba al día. */
  wrote: boolean;
};

/** Escribe vivos + preserva filas tombstone del CSV que no tienen obra viva con la misma clave. */
export async function exportToSyncCsv(db: SqlDb, syncDir: string): Promise<ExportCsvResult> {
  const existing = await readExistingSyncCsv(syncDir);
  const catalogMap = await catalogUpdatedMap(db);
  const live = await listLibraryWithCatalog(db, {});
  const liveRows = live.map((r) =>
    liveRowFromLibrary(r, catalogMap.get(r.catalog_item_id) ?? null),
  );
  const liveKeys = new Set(liveRows.map(syncCsvCatalogKey));

  const preservedTombs = existing.filter((r) => r.deleted && !liveKeys.has(syncCsvCatalogKey(r)));
  const rows = [...liveRows, ...preservedTombs];
  const path = await syncCsvPath(syncDir);
  const newContent = serializeSyncCsv(rows);

  let existingRaw = "";
  if (await exists(path)) existingRaw = await readTextFile(path);

  // Evita reescribir (y disparar sync/Syncthing) si el CSV ya está al día.
  const wrote = newContent !== existingRaw;
  if (wrote) {
    await writeTextFile(path, newContent);
  }
  return { exported: liveRows.length, wrote };
}
