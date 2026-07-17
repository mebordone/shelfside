<script lang="ts">
  import { t } from "$lib/i18n";

  interface Props {
    dbPath: string;
    dbSize: string;
    syncFolder: string | null;
    syncFolderDraft: string;
    syncFolderPlaceholder: string;
    showFolderPicker: boolean;
    needsStoragePermission: boolean;
    syncOnStart: boolean;
    statusMessage: { kind: "ok" | "err"; text: string } | null;
    busy: string | null;
    resetConfirmOpen: boolean;
    resetTyped: string;
    resetWord: string;
    onChooseSyncFolder: () => void;
    onRequestStoragePermission: () => void;
    onSyncOnStartChange: (value: boolean) => void;
    onSyncFolderDraftChange: (value: string) => void;
    onApplySyncFolderPath: () => void;
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
    syncFolderDraft,
    syncFolderPlaceholder,
    showFolderPicker,
    needsStoragePermission,
    syncOnStart,
    statusMessage,
    busy,
    resetConfirmOpen,
    resetTyped,
    resetWord,
    onChooseSyncFolder,
    onRequestStoragePermission,
    onSyncOnStartChange,
    onSyncFolderDraftChange,
    onApplySyncFolderPath,
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
  <label class="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
    <input
      type="checkbox"
      class="mt-0.5"
      checked={syncOnStart}
      disabled={busy !== null}
      onchange={(e) => onSyncOnStartChange((e.currentTarget as HTMLInputElement).checked)}
    />
    <span>
      <span class="font-medium">{t("settings.sync_on_start")}</span>
      <span class="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{t("settings.sync_on_start_help")}</span>
    </span>
  </label>
  {#if needsStoragePermission}
    <div
      class="space-y-2 rounded-md border border-amber-300 bg-amber-50/80 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"
    >
      <p class="text-amber-950 dark:text-amber-100">{t("settings.sync_storage_permission_needed")}</p>
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md bg-amber-800 px-3 text-sm text-white hover:bg-amber-900 disabled:opacity-50"
        disabled={busy !== null}
        onclick={() => onRequestStoragePermission()}
      >
        {t("settings.sync_storage_permission_grant")}
      </button>
    </div>
  {/if}
  {#if statusMessage}
    <p
      class="rounded-md border px-3 py-2 text-sm {statusMessage.kind === 'ok'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
        : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'}"
      role="status"
    >
      {statusMessage.text}
    </p>
  {/if}
  <label class="block text-xs text-zinc-600 dark:text-zinc-400" for="sync-folder-path">
    {t("settings.sync_folder")}
  </label>
  <input
    id="sync-folder-path"
    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm break-all dark:border-zinc-700 dark:bg-zinc-900"
    placeholder={syncFolderPlaceholder}
    value={syncFolderDraft}
    disabled={busy !== null}
    oninput={(e) => onSyncFolderDraftChange((e.currentTarget as HTMLInputElement).value)}
    onblur={() => onApplySyncFolderPath()}
    onkeydown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onApplySyncFolderPath();
      }
    }}
  />
  {#if syncFolder}
    <p class="text-xs break-all text-zinc-500">
      {t("settings.sync_folder_active")}:
      <code class="ml-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">{syncFolder}</code>
    </p>
  {:else}
    <p class="text-xs text-zinc-500">{t("settings.sync_no_folder")}</p>
  {/if}
  <div class="flex flex-wrap gap-2">
    {#if showFolderPicker}
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        disabled={busy !== null}
        onclick={() => onChooseSyncFolder()}
      >
        {t("settings.sync_choose_folder")}
      </button>
    {/if}
    <button
      type="button"
      class="shelf-btn-primary"
      disabled={busy !== null}
      onclick={() => onSyncFolder()}
    >
      {busy === "sync" ? t("common.loading") : t("settings.sync_now")}
    </button>
  </div>
  <details class="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
    <summary class="cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
      {t("settings.sync_advanced")}
    </summary>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-emerald-700 px-3 text-sm text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        disabled={busy !== null}
        onclick={() => onExportMd()}
      >
        {busy === "md" ? t("common.loading") : t("settings.sync_export_md")}
      </button>
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700"
        disabled={busy !== null}
        onclick={() => onImportMerge()}
      >
        {busy === "import" ? t("common.loading") : t("settings.sync_import")}
      </button>
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700"
        disabled={busy !== null || !syncFolder}
        onclick={() => onCleanRecycleOpen()}
      >
        {busy === "cleanRecycle" ? t("common.loading") : t("settings.sync_clean_recycle")}
      </button>
    </div>
  </details>
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
    class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700"
    disabled={busy !== null}
    onclick={() => onExportCsv()}
  >
    {busy === "csv" ? t("common.loading") : t("settings.export_csv")}
  </button>
  <button
    type="button"
    class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700"
    disabled={busy !== null}
    onclick={() => onBackup()}
  >
    {busy === "backup" ? t("common.loading") : t("settings.backup_db")}
  </button>
  <button
    type="button"
    class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700"
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
