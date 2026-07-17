<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { LIBRARY_LIST_PAGE_SIZE, listLibraryWithCatalogPage } from "$lib/db";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import SearchResultsPagination from "$lib/components/SearchResultsPagination.svelte";
  import HomePosterCard from "$lib/components/library/HomePosterCard.svelte";
  import LibraryQuickEditSheet from "$lib/components/library/LibraryQuickEditSheet.svelte";
  import { applyPageFromCache, commitSearchPage } from "$lib/library/catalogSearchPage";
  import { t } from "$lib/i18n";
  import {
    buildMediaFilterChipOptions,
    buildStatusFilterChipOptions,
  } from "$lib/library/searchSourceOptions";
  import { labelForMedia, labelForStatus } from "$lib/i18n/labels";
  import { mapLibraryRowsWithPosters } from "$lib/poster";
  import {
    clearLibraryPagination,
    clearLibrarySearch,
    initLibraryFilters,
    librarySession,
    setLibraryMediaFilter,
    setLibraryStatusFilter,
  } from "$lib/stores/librarySession.svelte";
  import { handoffLibraryQueryToSearch } from "$lib/stores/searchSession.svelte";
  import { persistLibraryView, readLibraryView, type LibraryView } from "$lib/stores/libraryView";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
  import type { LibraryListRow } from "$lib/db";
  import type { WithDisplayUrl } from "$lib/poster";

  type Row = WithDisplayUrl<LibraryListRow>;

  let loading = $state(false);
  let quickEditRow = $state<Row | null>(null);
  let view = $state<LibraryView>("grid");

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

  function onClearLibrarySearch() {
    clearLibrarySearch();
    void loadPage(0);
  }

  async function goSearchCatalog() {
    handoffLibraryQueryToSearch(librarySession.search);
    await goto(resolve("/search"));
  }

  const mediaChipOptions = $derived(buildMediaFilterChipOptions(t, labelForMedia));
  const statusChipOptions = $derived(buildStatusFilterChipOptions(t, labelForStatus));

  const libraryPath = resolve("/library");

  function onViewChange(v: LibraryView) {
    view = v;
    persistLibraryView(v);
  }

  onMount(() => {
    view = readLibraryView();
    initLibraryFilters();
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

<div class="mx-auto max-w-5xl space-y-6 px-4 py-8">
  <div class="flex items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold tracking-tight">{t("library.title")}</h1>
    <ViewToggle
      value={view}
      first="grid"
      second="list"
      firstLabel={t("library.view_grid")}
      secondLabel={t("library.view_list")}
      ariaLabel={t("library.view_toggle")}
      onchange={(v) => onViewChange(v as LibraryView)}
    />
  </div>

  <div class="space-y-3" aria-label={t("library.filters")}>
    <FilterChipBar
      options={mediaChipOptions}
      value={librarySession.mediaFilter}
      includeAll
      allLabel={t("media.all")}
      ariaLabel={t("library.media_filter")}
      onchange={(v) => {
        setLibraryMediaFilter(v);
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
        setLibraryStatusFilter(v);
        reloadFromFilters();
      }}
    />
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <input
          class="shelf-field w-full {librarySession.search.trim() ? 'pr-11' : ''}"
          placeholder={t("library.search_placeholder")}
          bind:value={librarySession.search}
          onkeydown={(e) => {
            if (e.key === "Enter") reloadFromFilters();
          }}
        />
        {#if librarySession.search.trim()}
          <button
            type="button"
            class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={t("library.clear_search")}
            title={t("common.clear")}
            onclick={onClearLibrarySearch}
          >
            ×
          </button>
        {/if}
      </div>
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
        <button
          type="button"
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          onclick={() => void goSearchCatalog()}
        >
          {t("nav.search")}
        </button>
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
    {#if view === "list"}
      <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800" data-testid="library-list">
        {#each librarySession.rows as r (r.id)}
          <li>
            <a
              class="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              href={resolve("/library/[id]", { id: String(r.id) })}
            >
              {#if r.displayUrl}
                <img src={r.displayUrl} alt="" class="h-14 w-10 shrink-0 rounded object-cover" />
              {:else}
                <div class="h-14 w-10 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
              {/if}
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title}</p>
                <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {labelForMedia(r.media_type)} · {labelForStatus(r.status)}
                </p>
              </div>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <div
        class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        data-testid="library-grid"
      >
        {#each librarySession.rows as r (r.id)}
          <HomePosterCard
            row={r}
            layout="grid"
            onLongPress={(row) => (quickEditRow = row)}
            onQuickEdit={(row) => (quickEditRow = row)}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<LibraryQuickEditSheet
  open={quickEditRow != null}
  row={quickEditRow}
  onClose={() => (quickEditRow = null)}
  onSaved={() => void loadPage(librarySession.page, true)}
/>
