import type { SqlDb } from "$lib/db/catalog";
import { exportToSyncCsv } from "./exportToSyncCsv";
import { mergeFromSyncCsv } from "./mergeFromCsv";
import type { MergeResult } from "./mergeFromFolder";

export type SyncFolderResult = {
  merge: MergeResult;
  exported: number;
  /** `true` si el CSV fue reescrito; `false` si ya estaba al día. */
  wrote: boolean;
};

/** Importa desde `shelfside.csv` y luego exporta el estado local (orden para sync con Syncthing). */
export async function syncSyncFolder(db: SqlDb, syncDir: string): Promise<SyncFolderResult> {
  const merge = await mergeFromSyncCsv(db, syncDir);
  const { exported, wrote } = await exportToSyncCsv(db, syncDir);
  return { merge, exported, wrote };
}
