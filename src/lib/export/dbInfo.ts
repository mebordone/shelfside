import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { stat } from "@tauri-apps/plugin-fs";

const DB_FILENAME = "shelfside.db";

export type DatabaseInfo = {
  path: string;
  sizeBytes: number | null;
};

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  try {
    const dir = await appLocalDataDir();
    const path = await join(dir, DB_FILENAME);
    const meta = await stat(path);
    return { path, sizeBytes: meta.size ?? null };
  } catch {
    return { path: "", sizeBytes: null };
  }
}

export function formatBytes(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
