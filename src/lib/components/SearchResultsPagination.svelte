<script lang="ts">
  import {
    canSearchPageNext,
    canSearchPagePrev,
    formatSearchPageCounter,
    formatSearchPageRange,
  } from "$lib/library/searchPagination";
  import { t } from "$lib/i18n";

  type Props = {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    shownCount: number;
    loading?: boolean;
    /** full: meta+botones; meta: solo rango; controls: solo botones */
    variant?: "full" | "meta" | "controls";
    onPrev: () => void;
    onNext: () => void;
  };

  let {
    page,
    pageSize,
    total,
    totalPages = 0,
    shownCount,
    loading = false,
    variant = "full",
    onPrev,
    onNext,
  }: Props = $props();

  const range = $derived(formatSearchPageRange(page, pageSize, total, shownCount));
</script>

{#if total > 0}
  {#if variant === "meta" && range}
    <p class="text-xs text-zinc-500 dark:text-zinc-400">
      {range.start}–{range.end} {t("search.page_of")} {range.total}
    </p>
  {:else if variant === "controls"}
    <div class="flex flex-wrap items-center justify-between gap-2">
      {#if range}
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          {range.start}–{range.end} {t("search.page_of")} {range.total}
        </p>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-40 dark:border-zinc-600"
          disabled={!canSearchPagePrev(page) || loading}
          onclick={onPrev}
        >
          {t("search.page_prev")}
        </button>
        <button
          type="button"
          class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-40 dark:border-zinc-600"
          disabled={!canSearchPageNext(page, pageSize, total, totalPages) || loading}
          onclick={onNext}
        >
          {t("search.page_next")}
        </button>
      </div>
    </div>
  {:else}
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-zinc-500 dark:text-zinc-400">
        {formatSearchPageCounter(page, pageSize, total, shownCount, totalPages)}
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-40 dark:border-zinc-600"
          disabled={!canSearchPagePrev(page) || loading}
          onclick={onPrev}
        >
          {t("search.page_prev")}
        </button>
        <button
          type="button"
          class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm disabled:opacity-40 dark:border-zinc-600"
          disabled={!canSearchPageNext(page, pageSize, total, totalPages) || loading}
          onclick={onNext}
        >
          {t("search.page_next")}
        </button>
      </div>
    </div>
  {/if}
{/if}
