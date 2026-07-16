import { deleteLibraryEntry, getLibraryEntryById, type SqlDb } from "$lib/db";
import { removePosterFile } from "$lib/poster";
import { writeTombstoneToSyncCsv } from "$lib/sync/writeTombstoneCsv";

export async function deleteLibraryEntryWithAssets(
  db: SqlDb,
  libraryId: number,
  options?: { syncDir?: string | null },
): Promise<void> {
  const row = await getLibraryEntryById(db, libraryId);
  if (!row) throw new Error("Entrada de biblioteca no encontrada.");

  const syncDir = options?.syncDir?.trim();
  if (syncDir) {
    await writeTombstoneToSyncCsv(syncDir, row);
  }

  const posterPath = row.poster_local_path;
  await deleteLibraryEntry(db, libraryId);
  await removePosterFile(posterPath);
}
