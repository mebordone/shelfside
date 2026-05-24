import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { readDir, remove } from "@tauri-apps/plugin-fs";
import type { SqlDb } from "./catalog";

export async function resetAllUserData(db: SqlDb): Promise<void> {
  await db.execute("DELETE FROM library_entry", []);
  await db.execute("DELETE FROM catalog_item", []);
  await clearPostersDir();
}

async function clearPostersDir(): Promise<void> {
  try {
    const root = await appLocalDataDir();
    const postersDir = await join(root, "posters");
    const entries = await readDir(postersDir);
    for (const ent of entries) {
      if (ent.name) {
        await remove(await join(postersDir, ent.name));
      }
    }
  } catch {
    /* posters/ puede no existir */
  }
}
