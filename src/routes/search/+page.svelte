<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getTmdbApiKeyFromEnv } from "$lib/api";
  import { userFacingError } from "$lib/api/userFacingError";
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
  import {
    getSearchHitsLibraryPresence,
    searchHitKey,
  } from "$lib/library/searchHitsLibraryPresence";
  import { buildSearchSourceChipOptions } from "$lib/library/searchSourceOptions";
  import { addSearchHitToLibrary } from "$lib/library/sources/registry";
  import { resolveCatalogLang } from "$lib/i18n/catalogLocale";
  import { t } from "$lib/i18n";
  import { persistOlStrictLanguage, readOlStrictLanguage } from "$lib/stores/catalogPrefs";
  import {
    clearSearchPagination,
    clearSearchResults,
    consumePendingAutoSearch,
    resetSearchSession,
    searchSession,
    type SearchHitRow,
    type SearchSource,
  } from "$lib/stores/searchSession.svelte";

  let loading = $state(false);
  let addingKey = $state<string | null>(null);
  /** library_entry.id por `searchHitKey`, o null si no está en biblioteca. */
  let libraryIdByHitKey = $state<Map<string, number | null>>(new Map());

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
    return searchHitKey(h);
  }

  function libraryIdFor(h: SearchHitRow): number | null {
    return libraryIdByHitKey.get(hitKey(h)) ?? null;
  }

  function onSourceChange(next: SearchSource) {
    if (searchSession.source === next) return;
    searchSession.source = next;
    libraryIdByHitKey = new Map();
    clearSearchResults();
  }

  function bookAuthorsLine(h: OpenLibrarySearchHit): string {
    return `${h.authors.join(", ")} · ${String(h.year)}`;
  }

  async function refreshLibraryPresence(hits: SearchHitRow[]) {
    if (hits.length === 0) {
      libraryIdByHitKey = new Map();
      return;
    }
    try {
      const db = await getDatabase();
      libraryIdByHitKey = await getSearchHitsLibraryPresence(db, hits);
    } catch {
      libraryIdByHitKey = new Map();
    }
  }

  async function loadPage(page: number) {
    const cached = applyPageFromCache(searchSession.pageCache, page);
    if (cached) {
      searchSession.page = page;
      searchSession.hits = cached;
      await refreshLibraryPresence(cached);
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
      await refreshLibraryPresence(rows);
    } catch (e) {
      searchSession.err = userFacingError(e);
      searchSession.hits = [];
      libraryIdByHitKey = new Map();
    } finally {
      loading = false;
    }
  }

  async function runSearch() {
    if (!canSearch) {
      searchSession.err = t("search.need_key");
      return;
    }
    if (!searchSession.query.trim()) return;
    loading = true;
    searchSession.err = null;
    searchSession.msg = null;
    try {
      clearSearchPagination();
      await loadPage(0);
    } catch (e) {
      searchSession.err = userFacingError(e);
      searchSession.hits = [];
      libraryIdByHitKey = new Map();
    } finally {
      loading = false;
    }
  }

  function onClearSearch() {
    libraryIdByHitKey = new Map();
    resetSearchSession();
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
      const next = new Map(libraryIdByHitKey);
      next.set(key, r.libraryId);
      libraryIdByHitKey = next;
      if (r.alreadyInLibrary) {
        searchSession.msg = t("search.already");
      } else {
        searchSession.msg = t("search.added");
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      searchSession.err = userFacingError(e);
    } finally {
      addingKey = null;
    }
  }

  onMount(() => {
    if (consumePendingAutoSearch()) {
      void runSearch();
    } else if (searchSession.hits.length > 0) {
      void refreshLibraryPresence(searchSession.hits);
    }
  });
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
    <div class="relative min-w-[12rem] flex-1">
      <input
        type="search"
        enterkeyhint="search"
        class="shelf-field w-full {searchSession.query.trim() ? 'pr-11' : ''}"
        placeholder={searchSession.source === "openlibrary"
          ? t("search.query_placeholder_books")
          : t("search.query_placeholder")}
        bind:value={searchSession.query}
        onfocus={(e) => {
          (e.currentTarget as HTMLInputElement).scrollIntoView({ block: "center", behavior: "smooth" });
        }}
      />
      {#if searchSession.query.trim() || searchSession.hits.length > 0}
        <button
          type="button"
          class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={t("search.clear")}
          title={t("common.clear")}
          onclick={onClearSearch}
        >
          ×
        </button>
      {/if}
    </div>
    <button
      type="submit"
      class="shelf-btn-primary"
      disabled={loading || !searchSession.query.trim() || !canSearch}
    >
      {t("search.submit")}
    </button>
  </form>

  {#if searchSession.err}
    <div class="flex flex-wrap items-center gap-3">
      <p class="text-sm text-red-600 dark:text-red-400">{searchSession.err}</p>
      {#if searchSession.query.trim() && canSearch}
        <button
          type="button"
          class="shelf-touch inline-flex min-h-9 items-center rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          disabled={loading}
          onclick={() => void loadPage(searchSession.page)}
        >
          {t("search.retry")}
        </button>
      {/if}
    </div>
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
        class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
        {@const inLibraryId = libraryIdFor(h)}
        <li class="flex items-center gap-3 bg-white p-3 dark:bg-zinc-900">
          <a
            class="group flex min-h-0 min-w-0 flex-1 items-center gap-3 self-stretch rounded-md outline-none ring-emerald-500/40 focus-visible:ring-2"
            href={h.kind === "tmdb"
              ? resolve("/search/[mediaType]/[id]", { mediaType: h.mediaType, id: String(h.id) })
              : resolve("/search/book/[editionId]", { editionId: h.editionId })}
            aria-label={h.kind === "tmdb" ? t("search.aria_open_detail_tmdb") : t("search.aria_open_detail_book")}
          >
            {#if h.thumb}
              <img
                src={h.thumb}
                alt=""
                class="h-20 w-14 shrink-0 rounded object-cover"
                onerror={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
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
            {#if inLibraryId != null}
              <a
                class="shelf-touch inline-flex min-h-11 max-w-[9.5rem] items-center justify-center rounded-md border border-zinc-300 px-3 text-center text-sm font-medium leading-snug text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                href={resolve("/library/[id]", { id: String(inLibraryId) })}
                aria-label={t("search.in_library_aria")}
                title={t("search.in_library")}
              >
                {t("search.in_library")}
              </a>
            {:else}
              <AddToLibraryMenuButton
                menuId={hitKey(h)}
                variant="row"
                busy={addingKey === hitKey(h)}
                disabled={!canSearch}
                onAdd={(status) => addHit(h, status)}
              />
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
