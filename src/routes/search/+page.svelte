<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getTmdbApiKeyFromEnv } from "$lib/api";
  import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
  import AddToLibraryMenuButton from "$lib/components/AddToLibraryMenuButton.svelte";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import SearchResultsPagination from "$lib/components/SearchResultsPagination.svelte";
  import type { Status } from "$lib/db/types";
  import { getDatabase } from "$lib/db/connection";
  import {
    applyPageFromCache,
    commitSearchPage,
    fetchSearchPage,
  } from "$lib/library/catalogSearchPage";
  import { buildSearchSourceChipOptions } from "$lib/library/searchSourceOptions";
  import { addSearchHitToLibrary } from "$lib/library/sources/registry";
  import { resolveCatalogLang } from "$lib/i18n/catalogLocale";
  import { t } from "$lib/i18n";
  import { persistOlStrictLanguage, readOlStrictLanguage } from "$lib/stores/catalogPrefs";
  import {
    clearSearchPagination,
    clearSearchResults,
    searchSession,
    type SearchHitRow,
    type SearchSource,
  } from "$lib/stores/searchSession.svelte";

  let loading = $state(false);
  let addingKey = $state<string | null>(null);

  const hasTmdbKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));
  const canSearch = $derived(
    searchSession.source === "openlibrary" ? true : hasTmdbKey,
  );

  const searchSourceChips = $derived(buildSearchSourceChipOptions(t));
  const catalogLangResolved = $derived(resolveCatalogLang());
  const catalogChipLabel = $derived(
    catalogLangResolved === "es" ? t("search.catalog_chip_es") : t("search.catalog_chip_en"),
  );
  const olStrictActive = $derived(readOlStrictLanguage());

  function hitKey(h: SearchHitRow): string {
    return h.kind === "tmdb" ? `tmdb-${h.mediaType}-${h.id}` : `ol-${h.editionId}`;
  }

  function onSourceChange(next: SearchSource) {
    if (searchSession.source === next) return;
    searchSession.source = next;
    clearSearchResults();
  }

  function bookAuthorsLine(h: OpenLibrarySearchHit): string {
    return `${h.authors.join(", ")} · ${String(h.year)}`;
  }

  async function loadPage(page: number) {
    const cached = applyPageFromCache(searchSession.pageCache, page);
    if (cached) {
      searchSession.page = page;
      searchSession.hits = cached;
      return;
    }

    loading = true;
    searchSession.err = null;
    try {
      const { rows, meta } = await fetchSearchPage(
        searchSession.source,
        searchSession.query,
        page,
        getTmdbApiKeyFromEnv(),
      );
      searchSession.pageCache = commitSearchPage(searchSession.pageCache, page, rows);
      searchSession.total = meta.total;
      searchSession.totalPages = meta.totalPages;
      searchSession.pageSize = meta.pageSize;
      searchSession.page = page;
      searchSession.hits = rows;
    } catch (e) {
      searchSession.err = e instanceof Error ? e.message : String(e);
      searchSession.hits = [];
    } finally {
      loading = false;
    }
  }

  async function runSearch() {
    if (!canSearch) {
      searchSession.err = t("search.need_key");
      return;
    }
    loading = true;
    searchSession.err = null;
    searchSession.msg = null;
    try {
      clearSearchPagination();
      await loadPage(0);
    } catch (e) {
      searchSession.err = e instanceof Error ? e.message : String(e);
      searchSession.hits = [];
    } finally {
      loading = false;
    }
  }

  async function clearStrictAndSearch() {
    persistOlStrictLanguage(false);
    clearSearchPagination();
    await loadPage(0);
  }

  async function addHit(hit: SearchHitRow, status: Status) {
    if (!canSearch) return;
    const key = hitKey(hit);
    addingKey = key;
    searchSession.err = null;
    searchSession.msg = null;
    try {
      const db = await getDatabase();
      const r = await addSearchHitToLibrary(db, hit, status);
      if (r.alreadyInLibrary) {
        searchSession.msg = t("search.already");
      } else {
        searchSession.msg = t("search.added");
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      searchSession.err = e instanceof Error ? e.message : String(e);
    } finally {
      addingKey = null;
    }
  }

</script>

<div class="mx-auto max-w-2xl space-y-4 px-4 py-8">
  <h1 class="text-2xl font-semibold">{t("search.title")}</h1>

  <FilterChipBar
    options={searchSourceChips}
    value={searchSession.source}
    ariaLabel={t("search.source_label")}
    onchange={(v) => onSourceChange(v as SearchSource)}
  />

  {#if searchSession.source === "tmdb" && !hasTmdbKey}
    <p class="text-sm text-amber-700 dark:text-amber-400">{t("search.need_key")}</p>
  {/if}

  <p class="text-xs text-zinc-600 dark:text-zinc-400">
    <a
      class="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-0.5 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
      href={resolve("/settings")}
      title={t("search.catalog_chip_settings")}
    >
      {catalogChipLabel}
    </a>
  </p>

  <form
    class="flex flex-wrap gap-2"
    onsubmit={(e) => {
      e.preventDefault();
      void runSearch();
    }}
  >
    <input
      class="shelf-field min-w-[12rem] flex-1"
      placeholder={searchSession.source === "openlibrary"
        ? t("search.query_placeholder_books")
        : t("search.query_placeholder")}
      bind:value={searchSession.query}
    />
    <button
      type="submit"
      class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      disabled={loading || !searchSession.query.trim() || !canSearch}
    >
      {t("search.submit")}
    </button>
  </form>

  {#if searchSession.err}
    <p class="text-sm text-red-600 dark:text-red-400">{searchSession.err}</p>
  {/if}
  {#if searchSession.msg}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{searchSession.msg}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if searchSession.hits.length === 0 && searchSession.query.trim() && canSearch}
    {#if searchSession.source === "openlibrary" && olStrictActive}
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("search.ol_strict_empty")}</p>
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        onclick={() => void clearStrictAndSearch()}
      >
        {t("search.ol_strict_clear")}
      </button>
    {:else}
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("search.empty")}</p>
    {/if}
  {:else if searchSession.hits.length > 0}
    <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("search.results")}</h2>
    <SearchResultsPagination
      page={searchSession.page}
      pageSize={searchSession.pageSize}
      total={searchSession.total}
      totalPages={searchSession.totalPages}
      shownCount={searchSession.hits.length}
      {loading}
      onPrev={() => void loadPage(searchSession.page - 1)}
      onNext={() => void loadPage(searchSession.page + 1)}
    />
    <p class="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{t("search.add_status_hint")}</p>
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each searchSession.hits as h (hitKey(h))}
        <li class="flex items-center gap-3 bg-white p-3 dark:bg-zinc-900">
          <a
            class="group flex min-h-0 min-w-0 flex-1 items-center gap-3 self-stretch rounded-md outline-none ring-emerald-500/40 focus-visible:ring-2"
            href={h.kind === "tmdb"
              ? resolve("/search/[mediaType]/[id]", { mediaType: h.mediaType, id: String(h.id) })
              : resolve("/search/book/[editionId]", { editionId: h.editionId })}
            aria-label={h.kind === "tmdb" ? t("search.aria_open_detail_tmdb") : t("search.aria_open_detail_book")}
          >
            {#if h.thumb}
              <img src={h.thumb} alt="" class="h-20 w-14 shrink-0 rounded object-cover" />
            {:else}
              <div class="h-20 w-14 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="font-medium group-hover:underline">{h.title}</p>
              {#if h.kind === "openlibrary" && h.workTitle}
                <p class="text-xs text-zinc-500 italic">{h.workTitle}</p>
              {/if}
              {#if h.kind === "tmdb"}
                <p class="text-xs text-zinc-500">
                  {t(`media.${h.mediaType}`)}{#if h.yearLabel} · {h.yearLabel}{/if}
                </p>
              {:else}
                <p class="text-xs text-zinc-500">{bookAuthorsLine(h)}</p>
              {/if}
              <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t("search.open_detail_hint")}</p>
            </div>
          </a>
          <div class="flex shrink-0 flex-col justify-center border-l border-zinc-200/70 pl-3 dark:border-zinc-700/70">
            <AddToLibraryMenuButton
              menuId={hitKey(h)}
              variant="row"
              busy={addingKey === hitKey(h)}
              disabled={!canSearch}
              onAdd={(status) => addHit(h, status)}
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
