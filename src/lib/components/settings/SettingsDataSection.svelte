<script lang="ts">
  import { t } from "$lib/i18n";

  interface Props {
    dbPath: string;
    dbSize: string;
    syncFolder: string | null;
    busy: string | null;
    resetConfirmOpen: boolean;
    resetTyped: string;
    resetWord: string;
    onChooseSyncFolder: () => void;
    onSyncFolder: () => void;
    onExportMd: () => void;
    onImportMerge: () => void;
    onCleanRecycleOpen: () => void;
    onCleanRecycleCancel: () => void;
    onCleanRecycleConfirm: () => void;
    cleanRecycleConfirmOpen: boolean;
    cleanRecyclePreview: string | null;
    onExportCsv: () => void;
    onBackup: () => void;
    onCopyLogs: () => void;
    onResetOpen: () => void;
    onResetCancel: () => void;
    onResetConfirm: () => void;
    onResetTypedChange: (value: string) => void;
  }

  let {
    dbPath,
    dbSize,
    syncFolder,
    busy,
    resetConfirmOpen,
    resetTyped,
    resetWord,
    onChooseSyncFolder,
    onSyncFolder,
    onExportMd,
    onImportMerge,
    onCleanRecycleOpen,
    onCleanRecycleCancel,
    onCleanRecycleConfirm,
    cleanRecycleConfirmOpen,
    cleanRecyclePreview,
    onExportCsv,
    onBackup,
    onCopyLogs,
    onResetOpen,
    onResetCancel,
    onResetConfirm,
    onResetTypedChange,
  }: Props = $props();
</script>

<section class="space-y-2">
  <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
    {t("settings.data")}
  </h2>
  <p class="text-xs text-zinc-600 dark:text-zinc-400">
    <span class="font-medium">{t("settings.db_path")}:</span>
    <code class="ml-1 break-all rounded bg-zinc-100 px-1 dark:bg-zinc-800">{dbPath}</code>
  </p>
  <p class="text-xs text-zinc-600 dark:text-zinc-400">
    <span class="font-medium">{t("settings.db_size")}:</span>
    {dbSize}
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
      onclick={() => onChooseSyncFolder()}
    >
      {t("settings.sync_choose_folder")}
    </button>
    <button
      type="button"
      class="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      disabled={busy !== null}
      onclick={() => onSyncFolder()}
    >
      {busy === "sync" ? t("common.loading") : t("settings.sync_now")}
    </button>
    <button
      type="button"
      class="rounded-md border border-emerald-700 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      disabled={busy !== null}
      onclick={() => onExportMd()}
    >
      {busy === "md" ? t("common.loading") : t("settings.sync_export_md")}
    </button>
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      disabled={busy !== null}
      onclick={() => onImportMerge()}
    >
      {busy === "import" ? t("common.loading") : t("settings.sync_import")}
    </button>
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      disabled={busy !== null || !syncFolder}
      onclick={() => onCleanRecycleOpen()}
    >
      {busy === "cleanRecycle" ? t("common.loading") : t("settings.sync_clean_recycle")}
    </button>
  </div>
  {#if cleanRecycleConfirmOpen && cleanRecyclePreview}
    <div
      class="space-y-2 rounded-md border border-amber-300 bg-amber-50/80 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"
    >
      <p class="text-amber-950 dark:text-amber-100">{t("settings.sync_clean_recycle_confirm")}</p>
      <p class="text-xs text-amber-900 dark:text-amber-200">{cleanRecyclePreview}</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md bg-amber-800 px-3 py-1.5 text-sm text-white hover:bg-amber-900 disabled:opacity-50"
          disabled={busy !== null}
          onclick={() => onCleanRecycleConfirm()}
        >
          {busy === "cleanRecycle" ? t("common.loading") : t("settings.sync_clean_recycle")}
        </button>
        <button type="button" class="rounded-md border px-3 py-1.5 text-sm" onclick={() => onCleanRecycleCancel()}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  {/if}
</section>

<section class="flex flex-wrap gap-2">
  <button
    type="button"
    class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
    disabled={busy !== null}
    onclick={() => onExportCsv()}
  >
    {busy === "csv" ? t("common.loading") : t("settings.export_csv")}
  </button>
  <button
    type="button"
    class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
    disabled={busy !== null}
    onclick={() => onBackup()}
  >
    {busy === "backup" ? t("common.loading") : t("settings.backup_db")}
  </button>
  <button
    type="button"
    class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
    disabled={busy !== null}
    onclick={() => onCopyLogs()}
  >
    {busy === "copyLogs" ? t("common.loading") : t("settings.logs_copy")}
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
      onclick={() => onResetOpen()}
    >
      {t("settings.reset")}
    </button>
  {:else}
    <p class="text-xs text-red-800 dark:text-red-300">{t("settings.reset_confirm")}</p>
    <label class="block text-xs" for="reset-type">{t("settings.reset_type")}</label>
    <input
      id="reset-type"
      class="mt-1 w-full rounded border border-red-300 px-2 py-1 text-sm dark:border-red-800 dark:bg-zinc-900"
      value={resetTyped}
      oninput={(e) => onResetTypedChange((e.currentTarget as HTMLInputElement).value)}
    />
    <div class="flex gap-2 pt-2">
      <button
        type="button"
        class="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        disabled={busy !== null || resetTyped !== resetWord}
        onclick={() => onResetConfirm()}
      >
        {busy === "reset" ? t("common.loading") : t("settings.reset")}
      </button>
      <button type="button" class="rounded-md border px-3 py-1.5 text-sm" onclick={() => onResetCancel()}>
        {t("common.cancel")}
      </button>
    </div>
  {/if}
</section>
