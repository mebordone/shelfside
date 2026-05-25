import type { SqlDb } from "$lib/db/catalog";
import { exportToSyncFolder } from "./exportToSyncFolder";
import { mergeFromSyncFolder, type MergeResult } from "./mergeFromFolder";

export type SyncFolderResult = {
  merge: MergeResult;
  exported: number;
};

/** Importa desde `library/*.md` y luego exporta el estado local (orden para sync con Syncthing). */
export async function syncSyncFolder(db: SqlDb, syncDir: string): Promise<SyncFolderResult> {
  const merge = await mergeFromSyncFolder(db, syncDir);
  const exported = await exportToSyncFolder(db, syncDir);
  return { merge, exported };
}
