<script lang="ts">
  import { onMount } from "svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { writeTextFile } from "@tauri-apps/plugin-fs";
  import SettingsAppearanceSection from "$lib/components/settings/SettingsAppearanceSection.svelte";
  import SettingsCatalogSection from "$lib/components/settings/SettingsCatalogSection.svelte";
  import SettingsDataSection from "$lib/components/settings/SettingsDataSection.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { resetAllUserData } from "$lib/db/reset";
  import { backupFilenameSuggestion, writeDatabaseBackup } from "$lib/export/backup";
  import { buildLibraryCsv } from "$lib/export/csv";
  import { formatBytes, getDatabaseInfo } from "$lib/export/dbInfo";
  import { exportAllMarkdownToLibraryDir } from "$lib/export/markdown";
  import { resolveMarkdownExportDestination, resolveSavePath } from "$lib/export/saveDestination";
  import { appLocale, setAppLocale, t } from "$lib/i18n";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { copyRuntimeLogsToClipboard, logError, logInfo, logWarn } from "$lib/logs/runtimeLogs";
  import { ANDROID_DEFAULT_SYNC_DIR, isAndroidPlatform } from "$lib/platform";
  import {
    type CatalogLangPreference,
    persistCatalogLang,
    persistOlStrictLanguage,
    readCatalogLang,
    readOlStrictLanguage,
  } from "$lib/stores/catalogPrefs";
  import { clearSearchResults, searchSession } from "$lib/stores/searchSession.svelte";
  import {
    formatRelativeTime,
    persistLastSync,
    readLastSync,
    type LastSync,
  } from "$lib/stores/lastSync";
  import { persistSyncFolder, readSyncFolder } from "$lib/stores/syncFolder";
  import { persistSyncOnStart, readSyncOnStart } from "$lib/stores/syncOnStart";
  import { hasAllFilesAccess, requestAllFilesAccess } from "$lib/sync/androidStorageAccess";
  import { cleanSyncRecycleBin, previewCleanSyncRecycleBin } from "$lib/sync/cleanSyncRecycleBin";
  import { formatCleanRecycleSummary } from "$lib/sync/formatCleanRecycleSummary";
  import { formatSyncSummary } from "$lib/sync/formatSyncSummary";
  import { mergeFromSyncFolder } from "$lib/sync/mergeFromFolder";
  import { syncSyncFolder } from "$lib/sync/syncSyncFolder";
  import { validateSyncFolderPath } from "$lib/sync/validateSyncFolder";

  let dbPath = $state("");
  let dbSize = $state<string>("—");
  let syncFolder = $state<string | null>(readSyncFolder());
  let syncFolderDraft = $state(readSyncFolder() ?? "");
  let busy = $state<string | null>(null);
  let message = $state<{ kind: "ok" | "err"; text: string } | null>(null);
  let resetConfirmOpen = $state(false);
  let resetTyped = $state("");
  let cleanRecycleConfirmOpen = $state(false);
  let cleanRecyclePreview = $state<string | null>(null);
  let catalogLang = $state<CatalogLangPreference>(readCatalogLang());
  let olStrict = $state(readOlStrictLanguage());
  let isAndroid = $state(false);
  let hasStorageAccess = $state(true);
  let syncOnStart = $state(readSyncOnStart());
  let lastSync = $state<LastSync | null>(null);
  const lastSyncLabel = $derived(lastSync ? formatRelativeTime(lastSync.at) : null);
  const resetWord = $derived(appLocale.current === "en" ? "DELETE" : "BORRAR");
  const showFolderPicker = $derived(!isAndroid);
  const needsStoragePermission = $derived(isAndroid && !hasStorageAccess);
  const syncFolderPlaceholder = $derived(
    isAndroid ? t("settings.sync_folder_placeholder_android") : t("settings.sync_folder_placeholder"),
  );

  function clearOpenLibrarySearchResults() {
    if (searchSession.source === "openlibrary" && searchSession.hits.length > 0) {
      clearSearchResults();
    }
  }

  function onCatalogLangChange(value: CatalogLangPreference) {
    catalogLang = value;
    persistCatalogLang(value);
    clearOpenLibrarySearchResults();
  }

  function onOlStrictChange(checked: boolean) {
    olStrict = checked;
    persistOlStrictLanguage(checked);
    clearOpenLibrarySearchResults();
  }

  function onSyncOnStartChange(checked: boolean) {
    syncOnStart = checked;
    persistSyncOnStart(checked);
  }

  onMount(() => {
    isAndroid = isAndroidPlatform();
    // Precargar ruta típica como valor real (no solo placeholder).
    if (isAndroid && !syncFolderDraft.trim()) {
      syncFolderDraft = ANDROID_DEFAULT_SYNC_DIR;
    }
    lastSync = readLastSync();
    void loadDbInfo();
    void refreshStorageAccess();
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshStorageAccess();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  });

  async function refreshStorageAccess() {
    if (!isAndroidPlatform()) {
      hasStorageAccess = true;
      return;
    }
    try {
      hasStorageAccess = await hasAllFilesAccess();
    } catch (e) {
      logWarn("settings.sync.storage_access.check_failed", e);
      hasStorageAccess = false;
    }
  }

  /** En Android exige MANAGE_EXTERNAL_STORAGE antes de tocar la carpeta Sync. */
  async function ensureStorageAccess(): Promise<boolean> {
    if (!isAndroidPlatform()) return true;
    await refreshStorageAccess();
    if (hasStorageAccess) return true;
    setMessage("err", t("settings.sync_storage_permission_denied"));
    return false;
  }

  async function runRequestStoragePermission() {
    message = null;
    try {
      const res = await requestAllFilesAccess();
      if (res.granted) {
        hasStorageAccess = true;
        setMessage("ok", t("settings.action_done"));
        return;
      }
      setMessage("ok", t("settings.sync_storage_permission_opened"));
    } catch (e) {
      logError("settings.sync.storage_access.request_failed", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    }
  }

  async function loadDbInfo() {
    const info = await getDatabaseInfo();
    dbPath = info.path || t("settings.db_unknown");
    dbSize = formatBytes(info.sizeBytes);
  }

  function setMessage(kind: "ok" | "err", text: string) {
    message = { kind, text };
  }

  async function chooseSyncFolder() {
    logInfo("settings.sync.choose_folder.open");
    try {
      const selected = await open({ directory: true, multiple: false, recursive: true });
      if (typeof selected === "string" && selected) {
        await applySyncFolderPath(selected);
      }
    } catch (e) {
      logWarn("settings.sync.choose_folder.unavailable", e);
      setMessage("err", t("settings.sync_picker_unavailable"));
    }
  }

  /** Valida, crea `…/shelfside` si hace falta, y persiste. Devuelve true si quedó aplicada. */
  async function applySyncFolderPath(raw: string): Promise<boolean> {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (!syncFolder) setMessage("err", t("settings.sync_no_folder"));
      return false;
    }
    // Ya aplicada: no repetir toast al salir del campo.
    if (
      syncFolder &&
      (trimmed === syncFolder ||
        trimmed.replace(/[/\\]+$/, "") === syncFolder.replace(/[/\\]+$/, "") ||
        // El usuario escribió la raíz Syncthing y ya tenemos …/shelfside.
        `${trimmed.replace(/[/\\]+$/, "")}/shelfside` === syncFolder.replace(/[/\\]+$/, ""))
    ) {
      syncFolderDraft = syncFolder;
      return true;
    }
    message = null;
    try {
      if (!(await ensureStorageAccess())) return false;
      const validated = await validateSyncFolderPath(trimmed);
      if (!validated.ok) {
        setMessage("err", t("settings.sync_path_invalid"));
        return false;
      }
      syncFolderDraft = validated.path;
      if (syncFolder === validated.path) return true;
      syncFolder = validated.path;
      persistSyncFolder(validated.path);
      logInfo("settings.sync.path.applied", { syncFolder: validated.path });
      setMessage("ok", t("settings.action_done"));
      return true;
    } catch (e) {
      logError("settings.sync.path.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  /** Si aún no hay carpeta activa, aplica el borrador (o el default Android) y luego sincroniza. */
  async function ensureSyncFolderReady(): Promise<boolean> {
    if (syncFolder) return true;
    const candidate =
      syncFolderDraft.trim() || (isAndroidPlatform() ? ANDROID_DEFAULT_SYNC_DIR : "");
    if (!candidate) {
      setMessage("err", t("settings.sync_no_folder"));
      return false;
    }
    syncFolderDraft = candidate;
    return applySyncFolderPath(candidate);
  }

  function recordLastSync(kind: "ok" | "err", summary: string) {
    const entry: LastSync = { at: Date.now(), kind, summary };
    persistLastSync(entry);
    lastSync = entry;
  }

  async function runSyncFolder() {
    if (!(await ensureSyncFolderReady()) || !syncFolder) {
      logError("settings.sync.run.no_folder");
      return;
    }
    if (!(await ensureStorageAccess())) return;
    busy = "sync";
    message = null;
    logInfo("settings.sync.run.start", { syncFolder });
    try {
      const db = await getDatabase();
      const { merge, exported } = await syncSyncFolder(db, syncFolder);
      logInfo("settings.sync.run.ok", { ...merge, exported, syncFolder });
      afterLibraryChanged();
      const summary = formatSyncSummary(merge, exported);
      setMessage(merge.errors.length ? "err" : "ok", summary);
      recordLastSync(merge.errors.length ? "err" : "ok", summary);
    } catch (e) {
      logError("settings.sync.run.error", e);
      const errText = e instanceof Error ? e.message : String(e);
      setMessage("err", errText);
      recordLastSync("err", errText);
    } finally {
      busy = null;
    }
  }

  async function runExportMd() {
    if (!(await ensureStorageAccess())) return;
    busy = "md";
    message = null;
    try {
      const { libraryDir, usedDownloadFallback } = await resolveMarkdownExportDestination(syncFolder);
      logInfo("settings.sync.export_md.start", { libraryDir, usedDownloadFallback, syncFolder });
      const db = await getDatabase();
      const n = await exportAllMarkdownToLibraryDir(db, libraryDir);
      logInfo("settings.sync.export_md.ok", { count: n, libraryDir });
      const msg = t("settings.export_md_ok_path")
        .replace("{n}", String(n))
        .replace("{path}", libraryDir);
      setMessage("ok", usedDownloadFallback ? `${t("settings.export_md_fallback")} ${msg}` : msg);
    } catch (e) {
      logError("settings.sync.export_md.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runImportMerge() {
    if (!syncFolder) {
      logError("settings.sync.import.no_folder");
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "import";
    message = null;
    logInfo("settings.sync.import.start", { syncFolder });
    try {
      const db = await getDatabase();
      const r = await mergeFromSyncFolder(db, syncFolder);
      logInfo("settings.sync.import.ok", { ...r, syncFolder });
      afterLibraryChanged();
      const summary = formatSyncSummary(r, 0);
      setMessage(r.errors.length ? "err" : "ok", summary);
      recordLastSync(r.errors.length ? "err" : "ok", summary);
    } catch (e) {
      logError("settings.sync.import.error", e);
      const errText = e instanceof Error ? e.message : String(e);
      setMessage("err", errText);
      recordLastSync("err", errText);
    } finally {
      busy = null;
    }
  }

  async function runCleanRecycleOpen() {
    if (!syncFolder) {
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "cleanRecycle";
    message = null;
    try {
      const db = await getDatabase();
      const preview = await previewCleanSyncRecycleBin(db, syncFolder);
      const previewText = t("settings.sync_clean_recycle_preview")
        .replace("{eligible}", String(preview.eligible))
        .replace("{skipped}", String(preview.skipped));
      cleanRecyclePreview = previewText;
      cleanRecycleConfirmOpen = true;
      if (preview.errors.length) {
        setMessage("err", preview.errors[0]);
      }
    } catch (e) {
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runCleanRecycleConfirm() {
    if (!syncFolder) return;
    busy = "cleanRecycle";
    message = null;
    logInfo("settings.sync.clean_recycle.start", { syncFolder });
    try {
      const db = await getDatabase();
      const result = await cleanSyncRecycleBin(db, syncFolder);
      cleanRecycleConfirmOpen = false;
      cleanRecyclePreview = null;
      logInfo("settings.sync.clean_recycle.ok", { ...result, syncFolder });
      setMessage(result.errors.length ? "err" : "ok", formatCleanRecycleSummary(result));
    } catch (e) {
      logError("settings.sync.clean_recycle.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runExportCsv() {
    busy = "csv";
    message = null;
    logInfo("settings.export_csv.start");
    try {
      const resolved = await resolveSavePath({
        defaultPath: "library.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (resolved.kind === "cancelled") return;
      const db = await getDatabase();
      const csv = await buildLibraryCsv(db);
      await writeTextFile(resolved.path, csv);
      logInfo("settings.export_csv.ok", { destination: resolved.path, bytes: csv.length });
      setMessage(
        "ok",
        resolved.kind === "fallback"
          ? t("settings.saved_to_path").replace("{path}", resolved.path)
          : t("settings.action_done"),
      );
    } catch (e) {
      logError("settings.export_csv.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runBackup() {
    busy = "backup";
    message = null;
    logInfo("settings.backup.start");
    try {
      const resolved = await resolveSavePath({
        defaultPath: backupFilenameSuggestion(),
        filters: [{ name: "SQLite", extensions: ["db"] }],
      });
      if (resolved.kind === "cancelled") return;
      await writeDatabaseBackup(resolved.path);
      logInfo("settings.backup.ok", { destination: resolved.path });
      setMessage(
        "ok",
        resolved.kind === "fallback"
          ? t("settings.saved_to_path").replace("{path}", resolved.path)
          : t("settings.action_done"),
      );
    } catch (e) {
      logError("settings.backup.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runCopyLogs() {
    busy = "copyLogs";
    message = null;
    try {
      await copyRuntimeLogsToClipboard();
      logInfo("settings.logs.copy.ok");
      setMessage("ok", t("settings.logs_copy_ok"));
    } catch (e) {
      logError("settings.logs.copy.error", e);
      setMessage("err", `${t("settings.logs_copy_failed")}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      busy = null;
    }
  }

  async function runReset() {
    if (resetTyped !== resetWord) return;
    busy = "reset";
    message = null;
    logWarn("settings.reset.start");
    try {
      const db = await getDatabase();
      await resetAllUserData(db);
      resetConfirmOpen = false;
      resetTyped = "";
      afterLibraryChanged();
      await loadDbInfo();
      logWarn("settings.reset.ok");
      setMessage("ok", t("settings.action_done"));
    } catch (e) {
      logError("settings.reset.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }
</script>

<main class="mx-auto max-w-2xl space-y-8 px-4 py-6">
  <h1 class="text-xl font-semibold text-emerald-900 dark:text-emerald-200">{t("settings.title")}</h1>

  {#if message}
    <p
      class="rounded-md border px-3 py-2 text-sm {message.kind === 'ok'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
        : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'}"
      role="status"
    >
      {message.text}
    </p>
  {/if}

  <SettingsAppearanceSection onLocaleChange={setAppLocale} />

  <SettingsCatalogSection
    {catalogLang}
    {olStrict}
    {onCatalogLangChange}
    {onOlStrictChange}
  />

  <SettingsDataSection
    {dbPath}
    {dbSize}
    {lastSyncLabel}
    lastSyncSummary={lastSync?.summary ?? null}
    lastSyncKind={lastSync?.kind ?? null}
    {syncFolder}
    {syncFolderDraft}
    {syncFolderPlaceholder}
    {showFolderPicker}
    {needsStoragePermission}
    {syncOnStart}
    statusMessage={message}
    {busy}
    {resetConfirmOpen}
    {resetTyped}
    {resetWord}
    onChooseSyncFolder={() => void chooseSyncFolder()}
    onRequestStoragePermission={() => void runRequestStoragePermission()}
    onSyncOnStartChange={onSyncOnStartChange}
    onSyncFolderDraftChange={(v) => {
      syncFolderDraft = v;
    }}
    onApplySyncFolderPath={() => void applySyncFolderPath(syncFolderDraft)}
    onSyncFolder={() => void runSyncFolder()}
    onExportMd={() => void runExportMd()}
    onImportMerge={() => void runImportMerge()}
    onCleanRecycleOpen={() => void runCleanRecycleOpen()}
    onCleanRecycleCancel={() => {
      cleanRecycleConfirmOpen = false;
      cleanRecyclePreview = null;
    }}
    onCleanRecycleConfirm={() => void runCleanRecycleConfirm()}
    {cleanRecycleConfirmOpen}
    {cleanRecyclePreview}
    onExportCsv={() => void runExportCsv()}
    onBackup={() => void runBackup()}
    onCopyLogs={() => void runCopyLogs()}
    onResetOpen={() => {
      resetConfirmOpen = true;
    }}
    onResetCancel={() => {
      resetConfirmOpen = false;
      resetTyped = "";
    }}
    onResetConfirm={() => void runReset()}
    onResetTypedChange={(v) => {
      resetTyped = v;
    }}
  />
</main>
