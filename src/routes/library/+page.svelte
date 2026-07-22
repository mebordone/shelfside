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
  import {
    initLibraryView,
    libraryView,
    setLibraryView,
    type LibraryView,
  } from "$lib/stores/libraryView.svelte";
  import { mobileLayout } from "$lib/stores/mobileLayout.svelte";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
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

  onMount(() => {
    initLibraryView();
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

<div class="shelf-page-browse max-w-5xl">
  <h1 class="sr-only">{t("library.title")}</h1>

  <div class="space-y-3" aria-label={t("library.filters")}>
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1">
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
      </div>
      {#if !mobileLayout.current}
        <ViewToggle
          value={libraryView.current}
          first="grid"
          second="list"
          firstLabel={t("library.view_grid")}
          secondLabel={t("library.view_list")}
          ariaLabel={t("library.view_toggle")}
          onchange={(v) => setLibraryView(v as LibraryView)}
        />
      {/if}
    </div>
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
  </div>

  <form
    class="w-full"
    onsubmit={(e) => {
      e.preventDefault();
      reloadFromFilters();
    }}
  >
    <div class="relative w-full">
      <input
        type="search"
        enterkeyhint="search"
        class="shelf-field w-full pr-[5.5rem]"
        placeholder={t("library.search_placeholder")}
        bind:value={librarySession.search}
        aria-label={t("library.search_placeholder")}
      />
      <div class="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {#if librarySession.search.trim()}
          <button
            type="button"
            class="shelf-touch flex h-9 w-9 items-center justify-center rounded-md text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={t("library.clear_search")}
            title={t("common.clear")}
            onclick={onClearLibrarySearch}
          >
            ×
          </button>
        {/if}
        <button
          type="submit"
          class="shelf-touch flex h-9 w-9 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
          disabled={loading}
          aria-label={t("common.apply")}
          title={t("common.apply")}
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M8.5 3a5.5 5.5 0 104.384 8.737l3.19 3.19a.75.75 0 101.06-1.06l-3.19-3.19A5.5 5.5 0 008.5 3zm-4 5.5a4 4 0 118 0 4 4 0 01-8 0z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </form>

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
    <div class="flex items-baseline justify-between gap-2">
      <span class="sr-only">{t("library.title")}</span>
      <SearchResultsPagination
        page={librarySession.page}
        pageSize={LIBRARY_LIST_PAGE_SIZE}
        total={librarySession.total}
        shownCount={librarySession.rows.length}
        {loading}
        variant="meta"
        onPrev={() => void loadPage(librarySession.page - 1)}
        onNext={() => void loadPage(librarySession.page + 1)}
      />
    </div>

    {#if libraryView.current === "list"}
      <ul
        class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        data-testid="library-list"
      >
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

    <div class="pt-1">
      <SearchResultsPagination
        page={librarySession.page}
        pageSize={LIBRARY_LIST_PAGE_SIZE}
        total={librarySession.total}
        shownCount={librarySession.rows.length}
        {loading}
        variant="controls"
        onPrev={() => void loadPage(librarySession.page - 1)}
        onNext={() => void loadPage(librarySession.page + 1)}
      />
    </div>
  {/if}
</div>

<LibraryQuickEditSheet
  open={quickEditRow != null}
  row={quickEditRow}
  onClose={() => (quickEditRow = null)}
  onSaved={() => void loadPage(librarySession.page, true)}
/>
