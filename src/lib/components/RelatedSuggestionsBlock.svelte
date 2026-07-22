<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Status } from "$lib/db/types";
  import AddToLibraryMenuButton from "$lib/components/AddToLibraryMenuButton.svelte";
  import { userFacingError } from "$lib/api/userFacingError";
  import { t } from "$lib/i18n";
  import { withReturnTo } from "$lib/nav/returnTo";

  export type RelatedDetailTarget =
    | { kind: "library"; id: number }
    | { kind: "tmdb"; mediaType: "movie" | "tv"; id: number }
    | { kind: "book"; editionId: string };

  export type RelatedSuggestionRow = {
    key: string;
    title: string;
    thumb: string | null;
    subtitle: string;
    libraryId: number | null;
    detailTarget: RelatedDetailTarget;
    detailAriaNew: string;
    detailAriaInLibrary: string;
    openInLibraryTitle?: string;
  };

  interface Props {
    ariaLabel: string;
    heading: string;
    subtitle: string;
    emptyLabel: string;
    loadingLabel: string;
    inLibraryLabel: string;
    openAriaLabel: string;
    openLabel?: string;
    addDisabled?: boolean;
    /** Si hay más de lo mostrado en el carrusel o se puede paginar. */
    canSeeMore?: boolean;
    /** Ruta de origen (ficha biblioteca) para que «Volver» en catálogo regrese ahí. */
    returnTo?: string | null;
    loadRows: () => Promise<RelatedSuggestionRow[]>;
    /** Carga acumulada para el sheet (página siguiente). */
    loadMoreRows?: (current: RelatedSuggestionRow[]) => Promise<RelatedSuggestionRow[]>;
    onAdd: (
      row: RelatedSuggestionRow,
      status: Status,
    ) => Promise<{ libraryId: number; alreadyInLibrary: boolean } | void>;
  }

  let {
    ariaLabel,
    heading,
    subtitle,
    emptyLabel,
    loadingLabel,
    inLibraryLabel,
    openAriaLabel,
    openLabel,
    addDisabled = false,
    canSeeMore = false,
    returnTo = null,
    loadRows,
    loadMoreRows,
    onAdd,
  }: Props = $props();

  let rows = $state<RelatedSuggestionRow[]>([]);
  let sheetRows = $state<RelatedSuggestionRow[]>([]);
  let loading = $state(false);
  let sheetLoading = $state(false);
  let sheetOpen = $state(false);
  let sheetCanLoadMore = $state(false);
  let err = $state<string | null>(null);
  let msg = $state<string | null>(null);
  let addingKey = $state<string | null>(null);
  let reloadNonce = $state(0);

  function detailHref(target: RelatedDetailTarget): string {
    let href: string;
    if (target.kind === "library") {
      href = resolve("/library/[id]", { id: String(target.id) });
    } else if (target.kind === "book") {
      href = resolve("/search/book/[editionId]", { editionId: target.editionId });
    } else {
      href = resolve("/search/[mediaType]/[id]", {
        mediaType: target.mediaType,
        id: String(target.id),
      });
    }
    return withReturnTo(href, returnTo);
  }

  function detailAria(row: RelatedSuggestionRow): string {
    return row.libraryId != null ? row.detailAriaInLibrary : row.detailAriaNew;
  }

  $effect(() => {
    const loader = loadRows;
    reloadNonce;
    let cancelled = false;
    loading = true;
    err = null;
    msg = null;

    void (async () => {
      try {
        const loaded = await loader();
        if (!cancelled) rows = loaded;
      } catch (e) {
        if (!cancelled) {
          err = userFacingError(e);
          rows = [];
        }
      } finally {
        if (!cancelled) loading = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function addWithStatus(row: RelatedSuggestionRow, status: Status) {
    addingKey = row.key;
    err = null;
    msg = null;
    try {
      const r = await onAdd(row, status);
      if (r) {
        rows = rows.map((item) =>
          item.key === row.key ? { ...item, libraryId: r.libraryId } : item,
        );
        sheetRows = sheetRows.map((item) =>
          item.key === row.key ? { ...item, libraryId: r.libraryId } : item,
        );
        msg = r.alreadyInLibrary ? t("search.already") : t("detail.related_added");
      }
    } catch (e) {
      err = userFacingError(e);
    } finally {
      addingKey = null;
    }
  }

  async function openSeeMore() {
    sheetOpen = true;
    sheetRows = [...rows];
    sheetCanLoadMore = Boolean(loadMoreRows) && canSeeMore;
    if (loadMoreRows && sheetRows.length === 0) {
      sheetLoading = true;
      try {
        sheetRows = await loadMoreRows([]);
        sheetCanLoadMore = sheetRows.length > 0;
      } catch (e) {
        err = userFacingError(e);
      } finally {
        sheetLoading = false;
      }
    }
  }

  async function onLoadMoreInSheet() {
    if (!loadMoreRows) {
      sheetCanLoadMore = false;
      return;
    }
    sheetLoading = true;
    try {
      const before = sheetRows.length;
      const next = await loadMoreRows(sheetRows);
      sheetRows = next;
      sheetCanLoadMore = next.length > before;
    } catch (e) {
      err = userFacingError(e);
      sheetCanLoadMore = false;
    } finally {
      sheetLoading = false;
    }
  }

  function closeSheet() {
    sheetOpen = false;
  }

  function retryLoad() {
    reloadNonce += 1;
  }
</script>

<section class="rounded-lg border border-zinc-200 dark:border-zinc-800" aria-label={ariaLabel}>
  <h2
    class="border-b border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
  >
    {heading}
  </h2>
  <p
    class="border-b border-zinc-200 px-3 pb-2 pt-0 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
  >
    {subtitle}{#if rows.length > 0 && !loading}
      {t("detail.related_add_hint")}{/if}
  </p>
  {#if msg}
    <p class="border-b border-zinc-200 px-3 py-2 text-xs text-emerald-700 dark:border-zinc-800 dark:text-emerald-400">
      {msg}
    </p>
  {/if}
  {#if loading}
    <p class="px-3 py-4 text-sm text-zinc-500">{loadingLabel}</p>
  {:else if err && rows.length === 0}
    <div class="flex flex-wrap items-center gap-3 px-3 py-3">
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
      <button
        type="button"
        class="shelf-touch inline-flex min-h-9 items-center rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        onclick={retryLoad}
      >
        {t("detail.related_retry")}
      </button>
    </div>
  {:else if rows.length === 0}
    <p class="px-3 py-3 text-xs text-zinc-500">{emptyLabel}</p>
  {:else}
    <div
      class="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-2 pb-2 pt-3 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
    >
      {#each rows as row (row.key)}
        <article
          class="w-[6.75rem] shrink-0 snap-start overflow-visible rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-[7.25rem]"
        >
          <div class="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
            <a
              class="absolute inset-0 z-0 block"
              href={detailHref(row.detailTarget)}
              aria-label={detailAria(row)}
            >
              {#if row.thumb}
                <img src={row.thumb} alt="" class="h-full w-full object-cover" />
              {/if}
            </a>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-11 pt-6"
            >
              <a
                class="pointer-events-auto line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                href={detailHref(row.detailTarget)}
                aria-label={detailAria(row)}
                title={row.libraryId != null ? openLabel : undefined}
                onclick={(e) => e.stopPropagation()}
              >
                {row.title}
              </a>
              <p class="mt-0.5 truncate text-[9px] text-white/90">{row.subtitle}</p>
            </div>
            <div class="absolute right-1 bottom-1 z-[2]">
              {#if row.libraryId != null}
                {#if row.detailTarget.kind === "library"}
                  <a
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-zinc-900/85 text-white shadow-md backdrop-blur-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    href={resolve("/library/[id]", { id: String(row.detailTarget.id) })}
                    aria-label={openAriaLabel}
                    title={row.openInLibraryTitle ?? inLibraryLabel + (openLabel ? ` · ${openLabel}` : "")}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path
                        d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-5l-1-1h-4L7 3H4.5z"
                      />
                    </svg>
                  </a>
                {/if}
              {:else}
                <AddToLibraryMenuButton
                  menuId={`related-${row.key}`}
                  variant="compact"
                  busy={addingKey === row.key}
                  disabled={addDisabled}
                  onAdd={(status) => addWithStatus(row, status)}
                />
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
    {#if canSeeMore || (loadMoreRows != null && rows.length > 0)}
      <div class="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          onclick={() => void openSeeMore()}
        >
          {t("detail.related_see_more")}
        </button>
      </div>
    {/if}
  {/if}
</section>

{#if sheetOpen}
  <div
    class="fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950"
    role="dialog"
    aria-modal="true"
    aria-labelledby="related-sheet-title"
  >
    <header
      class="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] dark:border-zinc-800"
    >
      <h2 id="related-sheet-title" class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {t("detail.related_see_more_title")}
      </h2>
      <button
        type="button"
        class="shelf-touch inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
        aria-label={t("detail.related_sheet_close")}
        onclick={closeSheet}
      >
        {t("common.close")}
      </button>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      {#if sheetLoading && sheetRows.length === 0}
        <p class="text-sm text-zinc-500">{loadingLabel}</p>
      {:else if sheetRows.length === 0}
        <p class="text-sm text-zinc-500">{emptyLabel}</p>
      {:else}
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {#each sheetRows as row (row.key)}
            <article class="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div class="relative aspect-[2/3] w-full bg-zinc-200 dark:bg-zinc-800">
                <a class="absolute inset-0 block" href={detailHref(row.detailTarget)} aria-label={detailAria(row)}>
                  {#if row.thumb}
                    <img src={row.thumb} alt="" class="h-full w-full object-cover" />
                  {/if}
                </a>
                <div class="absolute right-1 bottom-1 z-[1]">
                  {#if row.libraryId != null && row.detailTarget.kind === "library"}
                    <a
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-zinc-900/85 text-white shadow-md"
                      href={resolve("/library/[id]", { id: String(row.detailTarget.id) })}
                      aria-label={openAriaLabel}
                    >
                      <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path
                          d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-5l-1-1h-4L7 3H4.5z"
                        />
                      </svg>
                    </a>
                  {:else if row.libraryId == null}
                    <AddToLibraryMenuButton
                      menuId={`related-sheet-${row.key}`}
                      variant="compact"
                      busy={addingKey === row.key}
                      disabled={addDisabled}
                      onAdd={(status) => addWithStatus(row, status)}
                    />
                  {/if}
                </div>
              </div>
              <p class="line-clamp-2 px-1.5 py-1 text-center text-[11px] font-medium leading-tight text-zinc-800 dark:text-zinc-100">
                {row.title}
              </p>
            </article>
          {/each}
        </div>
        {#if sheetCanLoadMore && loadMoreRows}
          <div class="mt-4 flex justify-center">
            <button
              type="button"
              class="shelf-btn-primary"
              disabled={sheetLoading}
              onclick={() => void onLoadMoreInSheet()}
            >
              {sheetLoading ? t("common.loading") : t("detail.related_load_more")}
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
