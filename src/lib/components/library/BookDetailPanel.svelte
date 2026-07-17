<script lang="ts">
  import type { BookCatalogFields } from "$lib/library/openLibraryCatalogMeta";
  import { t } from "$lib/i18n";

  interface Props {
    bookCatalog: BookCatalogFields;
    progressCurrent?: number | null;
    progressTotal?: number | null;
  }

  let { bookCatalog, progressCurrent = null, progressTotal = null }: Props = $props();

  const hasProgress = $derived(progressCurrent != null || progressTotal != null);
</script>

<section class="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
  {#if hasProgress}
    <p class="mb-2 font-medium text-zinc-700 dark:text-zinc-300">{t("detail.progress_book")}</p>
    <p class="mb-3 text-zinc-600 dark:text-zinc-400">
      {t("detail.progress_pages")}:
      {progressCurrent ?? "—"}{#if progressTotal != null}<span> / {progressTotal}</span>{/if}
    </p>
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
