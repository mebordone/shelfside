<script lang="ts">
  import { onMount } from "svelte";
  import { open, save } from "@tauri-apps/plugin-dialog";
  import { writeTextFile } from "@tauri-apps/plugin-fs";
  import { getDatabase } from "$lib/db/connection";
  import { resetAllUserData } from "$lib/db/reset";
  import { backupFilenameSuggestion, writeDatabaseBackup } from "$lib/export/backup";
  import { buildLibraryCsv } from "$lib/export/csv";
  import { formatBytes, getDatabaseInfo } from "$lib/export/dbInfo";
  import { exportToSyncFolder } from "$lib/sync/exportToSyncFolder";
  import { mergeFromSyncFolder } from "$lib/sync/mergeFromFolder";
  import { appLocale, setAppLocale, t, type AppLocale } from "$lib/i18n";
  import { persistSyncFolder, readSyncFolder } from "$lib/stores/syncFolder";
  import { setTheme, theme } from "$lib/stores/theme.svelte";

  let dbPath = $state("");
  let dbSize = $state<string>("—");
  let syncFolder = $state<string | null>(readSyncFolder());
  let busy = $state<string | null>(null);
  let message = $state<{ kind: "ok" | "err"; text: string } | null>(null);
  let resetConfirmOpen = $state(false);
  let resetTyped = $state("");
  const resetWord = $derived(appLocale.current === "en" ? "DELETE" : "BORRAR");

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
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string" && selected) {
      syncFolder = selected;
      persistSyncFolder(selected);
      setMessage("ok", t("settings.action_done"));
    }
  }

  async function runExportMd() {
    if (!syncFolder) {
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "md";
    message = null;
    try {
      const db = await getDatabase();
      const n = await exportToSyncFolder(db, syncFolder);
      setMessage("ok", `${t("settings.action_done")} (${n})`);
    } catch (e) {
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runImportMerge() {
    if (!syncFolder) {
      setMessage("err", t("settings.sync_no_folder"));
      return;
    }
    busy = "import";
    message = null;
    try {
      const db = await getDatabase();
      const r = await mergeFromSyncFolder(db, syncFolder);
      const summary = `+${r.imported} ~${r.updated} skip ${r.skipped}`;
      if (r.errors.length) {
        setMessage("err", `${summary} — ${r.errors[0]}`);
      } else {
        setMessage("ok", summary);
      }
    } catch (e) {
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runExportCsv() {
    busy = "csv";
    message = null;
    try {
      const dest = await save({
        defaultPath: "library.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!dest) return;
      const db = await getDatabase();
      const csv = await buildLibraryCsv(db);
      await writeTextFile(dest, csv);
      setMessage("ok", t("settings.action_done"));
    } catch (e) {
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  async function runBackup() {
    busy = "backup";
    message = null;
    try {
      const dest = await save({
        defaultPath: backupFilenameSuggestion(),
        filters: [{ name: "SQLite", extensions: ["db"] }],
      });
      if (!dest) return;
      await writeDatabaseBackup(dest);
      setMessage("ok", t("settings.action_done"));
    } catch (e) {
      setMessage("err", e instanceof Error ? e.message : String(e));
    } finally {
      busy = null;
    }
  }

  function onLocaleChange(next: AppLocale) {
    setAppLocale(next);
  }

  async function runReset() {
    if (resetTyped !== resetWord) return;
    busy = "reset";
    message = null;
    try {
      const db = await getDatabase();
      await resetAllUserData(db);
      resetConfirmOpen = false;
      resetTyped = "";
      await loadDbInfo();
      setMessage("ok", t("settings.action_done"));
    } catch (e) {
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

  <section class="space-y-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
      {t("settings.appearance")}
    </h2>
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-zinc-500">{t("theme.toggle")}</span>
      <button
        type="button"
        class="rounded-md border px-2.5 py-1 text-xs {theme.mode === 'light'
          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
          : 'border-zinc-300 dark:border-zinc-700'}"
        onclick={() => setTheme("light")}>{t("theme.light")}</button
      >
      <button
        type="button"
        class="rounded-md border px-2.5 py-1 text-xs {theme.mode === 'dark'
          ? 'border-emerald-600 bg-emerald-950 text-emerald-100'
          : 'border-zinc-300 dark:border-zinc-700'}"
        onclick={() => setTheme("dark")}>{t("theme.dark")}</button
      >
    </div>
    <div class="space-y-1">
      <label class="text-xs text-zinc-500" for="locale-select">{t("settings.language")}</label>
      <select
        id="locale-select"
        class="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        value={appLocale.current}
        onchange={(e) => onLocaleChange((e.currentTarget as HTMLSelectElement).value as AppLocale)}
      >
        <option value="es">{t("settings.language.es")}</option>
        <option value="en">{t("settings.language.en")}</option>
      </select>
    </div>
  </section>

  <section class="space-y-2">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
      {t("settings.data")}
    </h2>
    <p class="text-xs text-zinc-600 dark:text-zinc-400">
      <span class="font-medium">{t("settings.db_path")}:</span>
      <code class="ml-1 break-all rounded bg-zinc-100 px-1 dark:bg-zinc-800">{dbPath}</code>
    </p>
    <p class="text-xs text-zinc-600 dark:text-zinc-400">
      <span class="font-medium">{t("settings.db_size")}:</span> {dbSize}
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
      {t("settings.sync")}
    </h2>
    <p class="text-xs text-zinc-600 dark:text-zinc-400">{t("settings.sync_help")}</p>
    <p class="text-xs break-all text-zinc-500">
      {syncFolder ?? t("settings.sync_no_folder")}
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        disabled={busy !== null}
        onclick={() => void chooseSyncFolder()}
      >
        {t("settings.sync_choose_folder")}
      </button>
      <button
        type="button"
        class="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
        disabled={busy !== null}
        onclick={() => void runExportMd()}
      >
        {busy === "md" ? t("common.loading") : t("settings.sync_export_md")}
      </button>
      <button
        type="button"
        class="rounded-md border border-emerald-700 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        disabled={busy !== null}
        onclick={() => void runImportMerge()}
      >
        {busy === "import" ? t("common.loading") : t("settings.sync_import")}
      </button>
    </div>
  </section>

  <section class="flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      disabled={busy !== null}
      onclick={() => void runExportCsv()}
    >
      {busy === "csv" ? t("common.loading") : t("settings.export_csv")}
    </button>
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      disabled={busy !== null}
      onclick={() => void runBackup()}
    >
      {busy === "backup" ? t("common.loading") : t("settings.backup_db")}
    </button>
  </section>

  <section class="space-y-3 rounded-lg border border-red-300 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
    <h2 class="text-sm font-semibold text-red-800 dark:text-red-300">{t("settings.danger")}</h2>
    <p class="text-xs text-red-700 dark:text-red-400">{t("settings.reset_hint")}</p>
    {#if !resetConfirmOpen}
      <button
        type="button"
        class="rounded-md border border-red-600 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/50"
        disabled={busy !== null}
        onclick={() => (resetConfirmOpen = true)}
      >
        {t("settings.reset")}
      </button>
    {:else}
      <p class="text-xs text-red-800 dark:text-red-300">{t("settings.reset_confirm")}</p>
      <label class="block text-xs" for="reset-type">{t("settings.reset_type")}</label>
      <input
        id="reset-type"
        class="mt-1 w-full rounded border border-red-300 px-2 py-1 text-sm dark:border-red-800 dark:bg-zinc-900"
        bind:value={resetTyped}
      />
      <div class="flex gap-2 pt-2">
        <button
          type="button"
          class="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          disabled={busy !== null || resetTyped !== resetWord}
          onclick={() => void runReset()}
        >
          {busy === "reset" ? t("common.loading") : t("settings.reset")}
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1.5 text-sm"
          onclick={() => {
            resetConfirmOpen = false;
            resetTyped = "";
          }}
        >
          {t("common.cancel")}
        </button>
      </div>
    {/if}
  </section>
</main>
