<script lang="ts">
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
  import { t } from "$lib/i18n/es";
  import {
    buildMediaFilterChipOptions,
    buildStatusFilterChipOptions,
  } from "$lib/library/searchSourceOptions";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  type Row = LibraryListRow & { displayUrl: string | null };

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let mediaFilter = $state("");
  let statusFilter = $state("");
  let search = $state("");
  let page = $state(0);
  let total = $state(0);
  let pageCache = $state<Record<number, Row[]>>({});

  function currentFilters() {
    const f: { mediaType?: string; status?: string; search?: string } = {};
    if (mediaFilter) f.mediaType = mediaFilter;
    if (statusFilter) f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return f;
  }

  function clearPagination() {
    page = 0;
    total = 0;
    pageCache = {};
  }

  async function mapRowsWithPosters(base: LibraryListRow[]): Promise<Row[]> {
    return Promise.all(
      base.map(async (r) => ({
        ...r,
        displayUrl: await resolvePosterDisplayUrl(r.poster_local_path, r.image_url),
      })),
    );
  }

  async function loadPage(targetPage: number) {
    const cached = pageCache[targetPage];
    if (cached) {
      page = targetPage;
      rows = cached;
      return;
    }

    loading = true;
    try {
      const db = await getDatabase();
      const result = await listLibraryWithCatalogPage(db, currentFilters(), targetPage);
      const mapped = await mapRowsWithPosters(result.rows);
      pageCache = { ...pageCache, [targetPage]: mapped };
      page = result.page;
      total = result.total;
      rows = mapped;
    } finally {
      loading = false;
    }
  }

  function reloadFromFilters() {
    clearPagination();
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

  onMount(() => void loadPage(0));
</script>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("library.title")}</h1>

  <div class="space-y-2" aria-label={t("library.filters")}>
    <FilterChipBar
      options={mediaChipOptions}
      value={mediaFilter}
      includeAll
      allLabel={t("media.all")}
      ariaLabel={t("library.media_filter")}
      onchange={(v) => {
        mediaFilter = v;
        reloadFromFilters();
      }}
    />
    <div class="flex flex-wrap items-center gap-2">
      <FilterChipBar
        options={statusChipOptions}
        value={statusFilter}
        includeAll
        allLabel={t("filter.all")}
        ariaLabel={t("library.status_filter")}
        onchange={(v) => {
          statusFilter = v;
          reloadFromFilters();
        }}
      />
      <input
        class="shelf-field shelf-field-compact min-w-[12rem] flex-1"
        placeholder={t("library.search_placeholder")}
        bind:value={search}
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
  {:else if rows.length === 0 && total === 0}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("library.empty")}</p>
  {:else if rows.length > 0}
    <SearchResultsPagination
      {page}
      pageSize={LIBRARY_LIST_PAGE_SIZE}
      {total}
      shownCount={rows.length}
      {loading}
      onPrev={() => void loadPage(page - 1)}
      onNext={() => void loadPage(page + 1)}
    />
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each rows as r (r.id)}
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
