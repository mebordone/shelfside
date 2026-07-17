<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { LIBRARY_LIST_PAGE_SIZE, listLibraryWithCatalogPage } from "$lib/db";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import SearchResultsPagination from "$lib/components/SearchResultsPagination.svelte";
  import LibraryQuickEditSheet from "$lib/components/library/LibraryQuickEditSheet.svelte";
  import { longPress } from "$lib/actions/longPress";
  import { applyPageFromCache, commitSearchPage } from "$lib/library/catalogSearchPage";
  import { t } from "$lib/i18n";
  import {
    buildMediaFilterChipOptions,
    buildStatusFilterChipOptions,
  } from "$lib/library/searchSourceOptions";
  import { labelForMedia, labelForStatus } from "$lib/i18n/labels";
  import { mapLibraryRowsWithPosters } from "$lib/poster";
  import { clearLibraryPagination, librarySession } from "$lib/stores/librarySession.svelte";
  import type { LibraryListRow } from "$lib/db";
  import type { WithDisplayUrl } from "$lib/poster";

  type Row = WithDisplayUrl<LibraryListRow>;

  let loading = $state(false);
  let quickEditRow = $state<Row | null>(null);

  function currentFilters() {
    const f: { mediaType?: string; status?: string; search?: string } = {};
    if (librarySession.mediaFilter) f.mediaType = librarySession.mediaFilter;
    if (librarySession.statusFilter) f.status = librarySession.statusFilter;
    if (librarySession.search.trim()) f.search = librarySession.search.trim();
    return f;
  }

  const hasActiveFilters = $derived(
    Boolean(
      librarySession.mediaFilter ||
        librarySession.statusFilter ||
        librarySession.search.trim(),
    ),
  );

  async function loadPage(targetPage: number, force = false) {
    if (!force) {
      const cached = applyPageFromCache(librarySession.pageCache, targetPage);
      if (cached) {
        librarySession.page = targetPage;
        librarySession.rows = cached;
        return;
      }
    }

    loading = true;
    try {
      const db = await getDatabase();
      const result = await listLibraryWithCatalogPage(db, currentFilters(), targetPage);
      const mapped = await mapLibraryRowsWithPosters(result.rows);
      librarySession.pageCache = commitSearchPage(librarySession.pageCache, targetPage, mapped);
      librarySession.page = result.page;
      librarySession.total = result.total;
      librarySession.rows = mapped;
      librarySession.hydrated = true;
    } finally {
      loading = false;
    }
  }

  function reloadFromFilters() {
    clearLibraryPagination();
    void loadPage(0);
  }

  const mediaChipOptions = $derived(buildMediaFilterChipOptions(t, labelForMedia));
  const statusChipOptions = $derived(buildStatusFilterChipOptions(t, labelForStatus));

  const libraryPath = resolve("/library");

  onMount(() => {
    if (!librarySession.hydrated) {
      void loadPage(0);
    }
  });

  afterNavigate(({ to, from }) => {
    if (to?.url.pathname !== libraryPath) return;
    if (from?.url.pathname === libraryPath) return;
    void loadPage(librarySession.hydrated ? librarySession.page : 0, true);
  });
</script>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("library.title")}</h1>

  <div class="space-y-3" aria-label={t("library.filters")}>
    <FilterChipBar
      options={mediaChipOptions}
      value={librarySession.mediaFilter}
      includeAll
      allLabel={t("media.all")}
      ariaLabel={t("library.media_filter")}
      onchange={(v) => {
        librarySession.mediaFilter = v;
        reloadFromFilters();
      }}
    />
    <FilterChipBar
      options={statusChipOptions}
      value={librarySession.statusFilter}
      includeAll
      allLabel={t("filter.all")}
      ariaLabel={t("library.status_filter")}
      onchange={(v) => {
        librarySession.statusFilter = v;
        reloadFromFilters();
      }}
    />
    <div class="flex flex-wrap items-center gap-2">
      <input
        class="shelf-field min-w-0 flex-1"
        placeholder={t("library.search_placeholder")}
        bind:value={librarySession.search}
        onkeydown={(e) => {
          if (e.key === "Enter") reloadFromFilters();
        }}
      />
      <button type="button" class="shelf-btn-primary shrink-0" onclick={reloadFromFilters}>
        {t("common.apply")}
      </button>
    </div>
  </div>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if librarySession.total === 0}
    <div class="space-y-3">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        {hasActiveFilters ? t("library.empty_filtered") : t("library.empty")}
      </p>
      <p class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/search")}>{t("nav.search")}</a
        >
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/add/manual")}>{t("nav.manual")}</a
        >
      </p>
    </div>
  {:else if librarySession.rows.length > 0}
    <SearchResultsPagination
      page={librarySession.page}
      pageSize={LIBRARY_LIST_PAGE_SIZE}
      total={librarySession.total}
      shownCount={librarySession.rows.length}
      {loading}
      onPrev={() => void loadPage(librarySession.page - 1)}
      onNext={() => void loadPage(librarySession.page + 1)}
    />
    <ul
      class="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
      data-testid="library-list"
    >
      {#each librarySession.rows as r (r.id)}
        <li class="relative flex bg-white dark:bg-zinc-900">
          <a
            class="flex min-h-14 min-w-0 flex-1 gap-3 p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
            href={resolve("/library/[id]", { id: String(r.id) })}
            data-library-id={String(r.id)}
            use:longPress={() => (quickEditRow = r)}
          >
            {#if r.displayUrl}
              <img src={r.displayUrl} alt="" class="h-16 w-11 shrink-0 rounded object-cover" />
            {:else}
              <div class="h-16 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            {/if}
            <div class="min-w-0 flex-1 self-center">
              <p class="font-medium text-zinc-900 dark:text-zinc-100">{r.title}</p>
              <p class="text-xs text-zinc-500">
                {labelForMedia(r.media_type)} · {labelForStatus(r.status)}
              </p>
            </div>
          </a>
          <button
            type="button"
            class="shelf-touch mr-2 self-center inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-lg font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={t("quick_edit.open_aria")}
            title={t("quick_edit.title")}
            onclick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              quickEditRow = r;
            }}
          >
            …
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<LibraryQuickEditSheet
  open={quickEditRow != null}
  row={quickEditRow}
  onClose={() => (quickEditRow = null)}
  onSaved={() => void loadPage(librarySession.page, true)}
/>
