/** Ruta típica de la carpeta Syncthing en Android (emulated storage). */
export const ANDROID_DEFAULT_SYNC_DIR = "/storage/emulated/0/Sync";

/** Detección ligera de Android (WebView / Tauri mobile). */
export function isAndroidPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
