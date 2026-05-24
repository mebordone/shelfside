<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import {
    LIBRARY_LIST_PAGE_SIZE,
    listLibraryWithCatalogPage,
    type LibraryListRow,
  } from "$lib/db";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import SearchResultsPagination from "$lib/components/SearchResultsPagination.svelte";
  import { applyPageFromCache, commitSearchPage } from "$lib/library/catalogSearchPage";
  import { t } from "$lib/i18n";
  import {
    buildMediaFilterChipOptions,
    buildStatusFilterChipOptions,
  } from "$lib/library/searchSourceOptions";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import {
    clearLibraryPagination,
    librarySession,
    type LibraryListRowWithPoster,
  } from "$lib/stores/librarySession.svelte";

  let loading = $state(false);

  function currentFilters() {
    const f: { mediaType?: string; status?: string; search?: string } = {};
    if (librarySession.mediaFilter) f.mediaType = librarySession.mediaFilter;
    if (librarySession.statusFilter) f.status = librarySession.statusFilter;
    if (librarySession.search.trim()) f.search = librarySession.search.trim();
    return f;
  }

  async function mapRowsWithPosters(base: LibraryListRow[]): Promise<LibraryListRowWithPoster[]> {
    return Promise.all(
      base.map(async (r) => ({
        ...r,
        displayUrl: await resolvePosterDisplayUrl(r.poster_local_path, r.image_url),
      })),
    );
  }

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
      const mapped = await mapRowsWithPosters(result.rows);
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

  function statusLabel(s: string): string {
    const k = `status.${s}`;
    const v = t(k);
    return v === k ? s : v;
  }

  function mediaLabel(m: string): string {
    const k = `media.${m}`;
    const v = t(k);
    return v === k ? m : v;
  }

  const mediaChipOptions = $derived(buildMediaFilterChipOptions(t, mediaLabel));
  const statusChipOptions = $derived(buildStatusFilterChipOptions(t, statusLabel));

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

  <div class="space-y-2" aria-label={t("library.filters")}>
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
    <div class="flex flex-wrap items-center gap-2">
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
      <input
        class="shelf-field shelf-field-compact min-w-[12rem] flex-1"
        placeholder={t("library.search_placeholder")}
        bind:value={librarySession.search}
        onkeydown={(e) => {
          if (e.key === "Enter") reloadFromFilters();
        }}
      />
      <button
        type="button"
        class="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        onclick={reloadFromFilters}
      >
        {t("common.apply")}
      </button>
    </div>
  </div>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if librarySession.rows.length === 0 && librarySession.total === 0}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("library.empty")}</p>
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
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each librarySession.rows as r (r.id)}
        <li class="flex gap-3 bg-white p-3 dark:bg-zinc-900">
          {#if r.displayUrl}
            <img src={r.displayUrl} alt="" class="h-16 w-11 shrink-0 rounded object-cover" />
          {:else}
            <div class="h-16 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          {/if}
          <div class="min-w-0 flex-1">
            <a class="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href={resolve("/library/[id]", { id: String(r.id) })}
              >{r.title}</a
            >
            <p class="text-xs text-zinc-500">
              {mediaLabel(r.media_type)} · {statusLabel(r.status)}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
