<script lang="ts">
  import { resolve } from "$app/paths";
  import { createOpenLibraryClient, type OpenLibrarySearchHit } from "$lib/api";
  import { getDatabase } from "$lib/db/connection";
  import { getOpenLibraryHitsLibraryPresence } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import AddToLibraryMenuButton from "$lib/components/AddToLibraryMenuButton.svelte";
  import { t } from "$lib/i18n/es";
  import { addOpenLibraryHitToLibraryFlow } from "$lib/library/openLibraryFlow";
  import {
    mergeRelatedOpenLibraryHits,
    RELATED_OPEN_LIBRARY_HITS_CAP,
  } from "$lib/library/openLibraryRelatedHits";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { SvelteMap } from "svelte/reactivity";

  type RelatedRow = OpenLibrarySearchHit & { thumb: string | null };

  interface Props {
    editionId: string;
  }

  let { editionId }: Props = $props();

  let relatedHits = $state<RelatedRow[]>([]);
  let relatedPresence = new SvelteMap<string, number | null>();
  let relatedLoading = $state(false);
  let relatedErr = $state<string | null>(null);
  let relatedMsg = $state<string | null>(null);
  let relatedAddingKey = $state<string | null>(null);

  $effect(() => {
    const eid = editionId.replace(/^\/books\//, "");
    if (!/^OL[\dA-Z]+M$/i.test(eid)) {
      relatedHits = [];
      relatedPresence.clear();
      relatedLoading = false;
      relatedErr = null;
      relatedMsg = null;
      return;
    }

    let cancelled = false;
    relatedLoading = true;
    relatedErr = null;

    void (async () => {
      try {
        const client = createOpenLibraryClient();
        const raw = await client.getRelatedEditionHits(eid);
        const merged = mergeRelatedOpenLibraryHits([raw], {
          cap: RELATED_OPEN_LIBRARY_HITS_CAP,
          excludeEditionId: eid,
        });
        const db = await getDatabase();
        const presence = await getOpenLibraryHitsLibraryPresence(
          db,
          merged.map((h) => ({ editionId: h.editionId })),
        );
        const withThumbs: RelatedRow[] = await Promise.all(
          merged.map(async (h) => ({
            ...h,
            thumb: await resolvePosterDisplayUrl(null, h.coverUrl),
          })),
        );
        if (!cancelled) {
          relatedHits = withThumbs;
          relatedPresence.clear();
          for (const [k, v] of presence) relatedPresence.set(k, v);
        }
      } catch (e) {
        if (!cancelled) {
          relatedErr = e instanceof Error ? e.message : String(e);
          relatedHits = [];
          relatedPresence.clear();
        }
      } finally {
        if (!cancelled) relatedLoading = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function addRelatedWithStatus(hit: RelatedRow, status: Status) {
    const rk = hit.editionId;
    relatedAddingKey = rk;
    relatedErr = null;
    relatedMsg = null;
    try {
      const db = await getDatabase();
      const client = createOpenLibraryClient();
      const r = await addOpenLibraryHitToLibraryFlow(db, client, hit, status);
      relatedPresence.set(rk, r.libraryId);
      relatedMsg = r.alreadyInLibrary ? t("search.already") : t("detail.related_added");
    } catch (e) {
      relatedErr = e instanceof Error ? e.message : String(e);
    } finally {
      relatedAddingKey = null;
    }
  }
</script>

<section
  class="rounded-lg border border-zinc-200 dark:border-zinc-800"
  aria-label={t("detail.related_openlibrary_heading")}
>
  <h2 class="border-b border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
    {t("detail.related_openlibrary_heading")}
  </h2>
  <p class="border-b border-zinc-200 px-3 pb-2 pt-0 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
    {t("detail.related_openlibrary_subtitle")}{#if relatedHits.length > 0 && !relatedLoading}
      {t("detail.related_add_hint")}{/if}
  </p>
  {#if relatedMsg}
    <p class="border-b border-zinc-200 px-3 py-2 text-xs text-emerald-700 dark:border-zinc-800 dark:text-emerald-400">
      {relatedMsg}
    </p>
  {/if}
  {#if relatedLoading}
    <p class="px-3 py-4 text-sm text-zinc-500">{t("detail.related_loading")}</p>
  {:else if relatedErr}
    <p class="px-3 py-3 text-sm text-red-600 dark:text-red-400">{relatedErr}</p>
  {:else if relatedHits.length === 0}
    <p class="px-3 py-3 text-xs text-zinc-500">{t("detail.related_empty")}</p>
  {:else}
    <div
      class="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-2 pb-2 pt-3 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
    >
      {#each relatedHits as h (h.editionId)}
        {@const libId = relatedPresence.get(h.editionId) ?? null}
        <article
          class="w-[6.75rem] shrink-0 snap-start overflow-visible rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-[7.25rem]"
        >
          <div class="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
            {#if h.thumb}
              <img src={h.thumb} alt="" class="h-full w-full object-cover" />
            {/if}
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-11 pt-6"
            >
              <a
                class="pointer-events-auto line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                href={libId != null
                  ? resolve("/library/[id]", { id: String(libId) })
                  : resolve("/search/book/[editionId]", { editionId: h.editionId })}
                aria-label={libId != null ? t("detail.related_open_aria") : t("detail.related_openlibrary_open")}
                title={libId != null ? t("detail.related_open") : undefined}
                onclick={(e) => e.stopPropagation()}
              >
                {h.title}
              </a>
              <p class="mt-0.5 truncate text-[9px] text-white/90">
                {h.authors[0] ?? ""}{#if h.year} · {h.year}{/if}
              </p>
            </div>
            <div class="absolute right-1 bottom-1 z-[2]">
              {#if libId != null}
                <a
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-zinc-900/85 text-white shadow-md backdrop-blur-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  href={resolve("/library/[id]", { id: String(libId) })}
                  aria-label={t("detail.related_open_aria")}
                  title={`${t("detail.related_in_library")} · ${t("detail.related_open")}`}
                >
                  <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path
                      d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-5l-1-1h-4L7 3H4.5z"
                    />
                  </svg>
                </a>
              {:else}
                <AddToLibraryMenuButton
                  menuId={`related-ol-${h.editionId}`}
                  variant="compact"
                  busy={relatedAddingKey === h.editionId}
                  onAdd={(status) => addRelatedWithStatus(h, status)}
                />
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
