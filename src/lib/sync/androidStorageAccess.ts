import { invoke } from "@tauri-apps/api/core";
import { isAndroidPlatform } from "$lib/platform";

export type StorageAccessRequestResult = {
  opened: boolean;
  granted: boolean;
};

/** En desktop siempre true; en Android consulta MANAGE_EXTERNAL_STORAGE. */
export async function hasAllFilesAccess(): Promise<boolean> {
  if (!isAndroidPlatform()) return true;
  return invoke<boolean>("has_all_files_access");
}

/** Abre Ajustes del sistema para conceder «Acceso a todos los archivos». */
export async function requestAllFilesAccess(): Promise<StorageAccessRequestResult> {
  if (!isAndroidPlatform()) return { opened: false, granted: true };
  return invoke<StorageAccessRequestResult>("request_all_files_access");
}
