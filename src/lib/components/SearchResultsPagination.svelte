<script lang="ts">
  import {
    canSearchPageNext,
    canSearchPagePrev,
    formatSearchPageCounter,
  } from "$lib/library/searchPagination";
  import { t } from "$lib/i18n/es";

  type Props = {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    shownCount: number;
    loading?: boolean;
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
    onPrev,
    onNext,
  }: Props = $props();
</script>

{#if total > 0}
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <p class="text-xs text-zinc-500 dark:text-zinc-400">
      {formatSearchPageCounter(page, pageSize, total, shownCount, totalPages)}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
        disabled={!canSearchPagePrev(page) || loading}
        onclick={onPrev}
      >
        {t("search.page_prev")}
      </button>
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
        disabled={!canSearchPageNext(page, pageSize, total, totalPages) || loading}
        onclick={onNext}
      >
        {t("search.page_next")}
      </button>
    </div>
  </div>
{/if}
