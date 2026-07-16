package com.mebordone.shelfside

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

/**
 * Acceso completo a almacenamiento (MANAGE_EXTERNAL_STORAGE) para leer/escribir
 * la carpeta Syncthing en rutas absolutas tipo /storage/emulated/0/Sync/shelfside.
 */
@TauriPlugin
class StorageAccessPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun hasAllFilesAccess(invoke: Invoke) {
    val granted =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
      } else {
        true
      }
    val ret = JSObject()
    ret.put("granted", granted)
    invoke.resolve(ret)
  }

  @Command
  fun requestAllFilesAccess(invoke: Invoke) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        if (Environment.isExternalStorageManager()) {
          val ret = JSObject()
          ret.put("opened", false)
          ret.put("granted", true)
          invoke.resolve(ret)
          return
        }
        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
        intent.data = Uri.parse("package:${activity.packageName}")
        activity.startActivity(intent)
        val ret = JSObject()
        ret.put("opened", true)
        ret.put("granted", false)
        invoke.resolve(ret)
      } else {
        val ret = JSObject()
        ret.put("opened", false)
        ret.put("granted", true)
        invoke.resolve(ret)
      }
    } catch (ex: Exception) {
      // Fallback: pantalla general de «acceso a todos los archivos»
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          activity.startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
          val ret = JSObject()
          ret.put("opened", true)
          ret.put("granted", false)
          invoke.resolve(ret)
          return
        }
      } catch (_: Exception) {
      }
      invoke.reject(ex.message ?: "Failed to open storage settings")
    }
  }
}
