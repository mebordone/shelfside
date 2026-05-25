<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Status } from "$lib/db/types";
  import AddToLibraryMenuButton from "$lib/components/AddToLibraryMenuButton.svelte";
  import { t } from "$lib/i18n";

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
    loadRows: () => Promise<RelatedSuggestionRow[]>;
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
    loadRows,
    onAdd,
  }: Props = $props();

  let rows = $state<RelatedSuggestionRow[]>([]);
  let loading = $state(false);
  let err = $state<string | null>(null);
  let msg = $state<string | null>(null);
  let addingKey = $state<string | null>(null);

  $effect(() => {
    const loader = loadRows;
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
          err = e instanceof Error ? e.message : String(e);
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
        msg = r.alreadyInLibrary ? t("search.already") : t("detail.related_added");
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      addingKey = null;
    }
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
  {:else if err}
    <p class="px-3 py-3 text-sm text-red-600 dark:text-red-400">{err}</p>
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
            {#if row.thumb}
              <img src={row.thumb} alt="" class="h-full w-full object-cover" />
            {/if}
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-11 pt-6"
            >
              {#if row.detailTarget.kind === "library"}
                <a
                  class="pointer-events-auto line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                  href={resolve("/library/[id]", { id: String(row.detailTarget.id) })}
                  aria-label={row.libraryId != null ? row.detailAriaInLibrary : row.detailAriaNew}
                  title={row.libraryId != null ? openLabel : undefined}
                  onclick={(e) => e.stopPropagation()}
                >
                  {row.title}
                </a>
              {:else if row.detailTarget.kind === "book"}
                <a
                  class="pointer-events-auto line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                  href={resolve("/search/book/[editionId]", { editionId: row.detailTarget.editionId })}
                  aria-label={row.detailAriaNew}
                  onclick={(e) => e.stopPropagation()}
                >
                  {row.title}
                </a>
              {:else}
                <a
                  class="pointer-events-auto line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                  href={resolve("/search/[mediaType]/[id]", {
                    mediaType: row.detailTarget.mediaType,
                    id: String(row.detailTarget.id),
                  })}
                  aria-label={row.detailAriaNew}
                  onclick={(e) => e.stopPropagation()}
                >
                  {row.title}
                </a>
              {/if}
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
  {/if}
</section>
