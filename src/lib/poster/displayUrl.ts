import { convertFileSrc } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, exists } from "@tauri-apps/plugin-fs";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** URL para `<img src>`: poster local vía Tauri o URL remota. */
export async function resolvePosterDisplayUrl(
  posterLocalPath: string | null,
  imageUrl: string | null,
): Promise<string | null> {
  if (posterLocalPath && isTauriRuntime()) {
    try {
      const hasLocal = await exists(posterLocalPath, { baseDir: BaseDirectory.AppLocalData });
      if (hasLocal) {
        const root = await appLocalDataDir();
        const abs = await join(root, posterLocalPath);
        return convertFileSrc(abs);
      }
    } catch {
      /* fallback a remota */
    }
  }
  return imageUrl;
}
