//! Acceso a almacenamiento externo en Android (carpeta Syncthing).
//! En desktop los comandos son no-op y reportan acceso concedido.

use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Runtime,
};
#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
pub struct AndroidStorageState<R: Runtime>(pub tauri::plugin::PluginHandle<R>);

#[cfg(target_os = "android")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GrantedResponse {
    granted: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestResponse {
    pub opened: bool,
    pub granted: bool,
}

/// Registra el plugin Kotlin `StorageAccessPlugin` (solo Android).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("android-storage")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    api.register_android_plugin("com.mebordone.shelfside", "StorageAccessPlugin")?;
                app.manage(AndroidStorageState(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub fn has_all_files_access<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let state = app
            .try_state::<AndroidStorageState<R>>()
            .ok_or_else(|| "android-storage plugin not ready".to_string())?;
        let res: GrantedResponse = state
            .0
            .run_mobile_plugin("hasAllFilesAccess", ())
            .map_err(|e| e.to_string())?;
        Ok(res.granted)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(true)
    }
}

#[tauri::command]
pub fn request_all_files_access<R: Runtime>(app: AppHandle<R>) -> Result<RequestResponse, String> {
    #[cfg(target_os = "android")]
    {
        let state = app
            .try_state::<AndroidStorageState<R>>()
            .ok_or_else(|| "android-storage plugin not ready".to_string())?;
        state
            .0
            .run_mobile_plugin("requestAllFilesAccess", ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(RequestResponse {
            opened: false,
            granted: true,
        })
    }
}
