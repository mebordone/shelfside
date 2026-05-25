import { deleteLibraryEntry, getLibraryEntryById, type SqlDb } from "$lib/db";
import { removePosterFile } from "$lib/poster";

export async function deleteLibraryEntryWithAssets(db: SqlDb, libraryId: number): Promise<void> {
  const row = await getLibraryEntryById(db, libraryId);
  if (!row) throw new Error("Entrada de biblioteca no encontrada.");

  const posterPath = row.poster_local_path;
  await deleteLibraryEntry(db, libraryId);
  await removePosterFile(posterPath);
}
