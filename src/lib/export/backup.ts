import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

const DB_FILENAME = "shelfside.db";

export async function readDatabaseBytes(): Promise<Uint8Array> {
  const dir = await appLocalDataDir();
  const dbPath = await join(dir, DB_FILENAME);
  return readFile(dbPath);
}

export async function writeDatabaseBackup(destPath: string): Promise<void> {
  const bytes = await readDatabaseBytes();
  await writeFile(destPath, bytes);
}

export function backupFilenameSuggestion(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `shelfside-${stamp}.db`;
}
