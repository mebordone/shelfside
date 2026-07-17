<script lang="ts">
  import type { BookCatalogFields } from "$lib/library/openLibraryCatalogMeta";
  import {
    isValidNonNegativeIntInput,
    parseNonNegativeIntOrNull,
  } from "$lib/library/quickEditPatch";
  import { t } from "$lib/i18n";

  interface Props {
    bookCatalog: BookCatalogFields;
    progressCurrent?: number | null;
    progressTotal?: number | null;
    busy?: boolean;
    onSaveProgress?: (patch: {
      progress_current: number | null;
      progress_total: number | null;
    }) => void | Promise<void>;
  }

  let {
    bookCatalog,
    progressCurrent = null,
    progressTotal = null,
    busy = false,
    onSaveProgress,
  }: Props = $props();

  let editing = $state(false);
  let currentDraft = $state("");
  let totalDraft = $state("");
  let localErr = $state<string | null>(null);

  const canEdit = $derived(typeof onSaveProgress === "function");
  const canSave = $derived(
    isValidNonNegativeIntInput(currentDraft) && isValidNonNegativeIntInput(totalDraft),
  );

  function openEdit() {
    if (!canEdit || busy) return;
    localErr = null;
    currentDraft = progressCurrent != null ? String(progressCurrent) : "";
    totalDraft = progressTotal != null ? String(progressTotal) : "";
    editing = true;
  }

  function closeEdit() {
    editing = false;
    localErr = null;
  }

  async function save() {
    if (!onSaveProgress || !canSave || busy) return;
    const current = parseNonNegativeIntOrNull(currentDraft);
    const total = parseNonNegativeIntOrNull(totalDraft);
    if (current === undefined || total === undefined) {
      localErr = t("quick_edit.invalid_number");
      return;
    }
    localErr = null;
    await onSaveProgress({ progress_current: current, progress_total: total });
    closeEdit();
  }
</script>

<section class="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800" data-testid="book-detail-panel">
  {#if canEdit || progressCurrent != null || progressTotal != null}
    <p class="mb-2 font-medium text-zinc-700 dark:text-zinc-300">{t("detail.progress_book")}</p>
    {#if editing}
      <div class="mb-3 space-y-3">
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.progress_current")}</span>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            class="shelf-field mt-1 min-h-11"
            bind:value={currentDraft}
            disabled={busy}
          />
        </label>
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.progress_total")}</span>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            class="shelf-field mt-1 min-h-11"
            bind:value={totalDraft}
            disabled={busy}
          />
        </label>
        {#if localErr}
          <p class="text-sm text-red-600 dark:text-red-400">{localErr}</p>
        {/if}
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="shelf-btn-primary"
            disabled={busy || !canSave}
            onclick={() => void save()}
          >
            {busy ? t("quick_edit.saving") : t("common.save")}
          </button>
          <button
            type="button"
            class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
            disabled={busy}
            onclick={closeEdit}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    {:else if canEdit}
      <button
        type="button"
        class="mb-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800/80"
        disabled={busy}
        onclick={openEdit}
      >
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.progress_pages")}</span>
        <span class="tabular-nums font-medium text-emerald-800 dark:text-emerald-300">
          {progressCurrent ?? "—"}{#if progressTotal != null}<span> / {progressTotal}</span>{/if}
        </span>
      </button>
    {:else}
      <p class="mb-3 text-zinc-600 dark:text-zinc-400">
        {t("detail.progress_pages")}:
        {progressCurrent ?? "—"}{#if progressTotal != null}<span> / {progressTotal}</span>{/if}
      </p>
    {/if}
  {/if}
  {#if bookCatalog.authors.length > 0}
    <p>
      <span class="font-medium">{t("detail.book_authors")}:</span>
      {bookCatalog.authors.join(", ")}
    </p>
  {/if}
  {#if bookCatalog.year != null}
    <p class="mt-1">
      <span class="font-medium">{t("detail.book_year")}:</span>
      {bookCatalog.year}
    </p>
  {/if}
  {#if bookCatalog.isbn}
    <p class="mt-1">
      <span class="font-medium">{t("detail.book_isbn")}:</span>
      {bookCatalog.isbn}
    </p>
  {/if}
  {#if bookCatalog.languages.length > 0}
    <p class="mt-1">
      <span class="font-medium">{t("detail.book_languages")}:</span>
      {bookCatalog.languages.join(", ")}
    </p>
  {/if}
  {#if bookCatalog.openLibraryUrl}
    <p class="mt-2">
      <button
        type="button"
        class="text-left text-emerald-700 hover:underline dark:text-emerald-400"
        onclick={() => window.open(bookCatalog.openLibraryUrl!, "_blank", "noopener,noreferrer")}
      >
        {t("detail.book_open_library")}
      </button>
    </p>
  {/if}
  {#if bookCatalog.overview}
    <p class="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{bookCatalog.overview}</p>
  {/if}
</section>
