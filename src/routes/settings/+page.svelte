<script lang="ts">
  import { onMount } from "svelte";
  import { open, save } from "@tauri-apps/plugin-dialog";
  import { writeTextFile } from "@tauri-apps/plugin-fs";
  import SettingsAppearanceSection from "$lib/components/settings/SettingsAppearanceSection.svelte";
  import SettingsCatalogSection from "$lib/components/settings/SettingsCatalogSection.svelte";
  import SettingsDataSection from "$lib/components/settings/SettingsDataSection.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { resetAllUserData } from "$lib/db/reset";
  import { backupFilenameSuggestion, writeDatabaseBackup } from "$lib/export/backup";
  import { buildLibraryCsv } from "$lib/export/csv";
  import { formatBytes, getDatabaseInfo } from "$lib/export/dbInfo";
  import { appLocale, setAppLocale, t } from "$lib/i18n";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import {
    type CatalogLangPreference,
    persistCatalogLang,
    persistOlStrictLanguage,
    readCatalogLang,
    readOlStrictLanguage,
  } from "$lib/stores/catalogPrefs";
  import { clearSearchResults, searchSession } from "$lib/stores/searchSession.svelte";
  import { persistSyncFolder, readSyncFolder } from "$lib/stores/syncFolder";
  import { formatSyncSummary } from "$lib/sync/formatSyncSummary";
  import { formatCleanRecycleSummary } from "$lib/sync/formatCleanRecycleSummary";
  import { previewCleanSyncRecycleBin, cleanSyncRecycleBin } from "$lib/sync/cleanSyncRecycleBin";
  import { exportToSyncFolder } from "$lib/sync/exportToSyncFolder";
  import { mergeFromSyncFolder } from "$lib/sync/mergeFromFolder";
  import { syncSyncFolder } from "$lib/sync/syncSyncFolder";
  import { copyRuntimeLogsToClipboard, logError, logInfo, logWarn } from "$lib/logs/runtimeLogs";

  let dbPath = $state("");
  let dbSize = $state<string>("—");
  let syncFolder = $state<string | null>(readSyncFolder());
  let busy = $state<string | null>(null);
  let message = $state<{ kind: "ok" | "err"; text: string } | null>(null);
  let resetConfirmOpen = $state(false);
  let resetTyped = $state("");
  let cleanRecycleConfirmOpen = $state(false);
  let cleanRecyclePreview = $state<string | null>(null);
  let catalogLang = $state<CatalogLangPreference>(readCatalogLang());
  let olStrict = $state(readOlStrictLanguage());
  const resetWord = $derived(appLocale.current === "en" ? "DELETE" : "BORRAR");

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

  onMount(() => {
    void loadDbInfo();
  });

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
    const selected = await open({ directory: true, multiple: false, recursive: true });
    if (typeof selected === "string" && selected) {
      syncFolder = selected;
      persistSyncFolder(selected);
      logInfo("settings.sync.choose_folder.selected", { syncFolder: selected });
      setMessage("ok", t("settings.action_done"));
    }
  }

  async function runSyncFolder() {
    if (!syncFolder) {
      logError("settings.sync.run.no_folder");
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "sync";
    message = null;
    logInfo("settings.sync.run.start", { syncFolder });
    try {
      const db = await getDatabase();
      const { merge, exported } = await syncSyncFolder(db, syncFolder);
      logInfo("settings.sync.run.ok", { ...merge, exported, syncFolder });
      afterLibraryChanged();
      setMessage(merge.errors.length ? "err" : "ok", formatSyncSummary(merge, exported));
    } catch (e) {
      logError("settings.sync.run.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runExportMd() {
    if (!syncFolder) {
      logError("settings.sync.export_md.no_folder");
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "md";
    message = null;
    logInfo("settings.sync.export_md.start", { syncFolder });
    try {
      const db = await getDatabase();
      const n = await exportToSyncFolder(db, syncFolder);
      logInfo("settings.sync.export_md.ok", { count: n, syncFolder });
      setMessage("ok", `${t("settings.export_md_ok")} (${n})`);
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
      setMessage(r.errors.length ? "err" : "ok", formatSyncSummary(r, 0));
    } catch (e) {
      logError("settings.sync.import.error", e);
      setMessage("err", e instanceof Error ? e.message : String(e));
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
      const dest = await save({
        defaultPath: "library.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!dest) return;
      const db = await getDatabase();
      const csv = await buildLibraryCsv(db);
      await writeTextFile(dest, csv);
      logInfo("settings.export_csv.ok", { destination: dest, bytes: csv.length });
      setMessage("ok", t("settings.action_done"));
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
      const dest = await save({
        defaultPath: backupFilenameSuggestion(),
        filters: [{ name: "SQLite", extensions: ["db"] }],
      });
      if (!dest) return;
      await writeDatabaseBackup(dest);
      logInfo("settings.backup.ok", { destination: dest });
      setMessage("ok", t("settings.action_done"));
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
    {syncFolder}
    {busy}
    {resetConfirmOpen}
    {resetTyped}
    {resetWord}
    onChooseSyncFolder={() => void chooseSyncFolder()}
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
