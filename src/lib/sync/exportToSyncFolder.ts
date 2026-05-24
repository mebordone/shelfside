import type { SqlDb } from "$lib/db/catalog";
import { exportAllMarkdownToFolder } from "$lib/export/markdown";

export async function exportToSyncFolder(db: SqlDb, syncDir: string): Promise<number> {
  return exportAllMarkdownToFolder(db, syncDir);
}
