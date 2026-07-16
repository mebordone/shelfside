import { join } from "@tauri-apps/api/path";

export const SYNC_CSV_FILENAME = "shelfside.csv";

export async function syncCsvPath(syncDir: string): Promise<string> {
  return join(syncDir, SYNC_CSV_FILENAME);
}
