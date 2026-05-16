<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { createTmdbClient, getTmdbApiKeyFromEnv, type TmdbSearchHit } from "$lib/api";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, getTmdbHitsLibraryPresence, type LibraryListRow } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { addTmdbHitToLibraryFlow, refreshTmdbCatalogFlow } from "$lib/library/tmdbFlow";
  import { tmdbTvCatalogFromMetadata } from "$lib/library/tmdbCatalogMeta";
  import { mergeRelatedTmdbHits, RELATED_TMDB_HITS_CAP } from "$lib/library/tmdbRelatedHits";
  import { t } from "$lib/i18n/es";
  import TmdbAddMenuButton from "$lib/components/TmdbAddMenuButton.svelte";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { SvelteMap } from "svelte/reactivity";

  type RelatedRow = TmdbSearchHit & { thumb: string | null };

  let row = $state<LibraryListRow | null>(null);
  let posterUrl = $state<string | null>(null);
  let loading = $state(true);
  let busy = $state(false);
  let err = $state<string | null>(null);

  let relatedHits = $state<RelatedRow[]>([]);
  let relatedPresence = new SvelteMap<string, number | null>();
  let relatedLoading = $state(false);
  let relatedErr = $state<string | null>(null);
  let relatedMsg = $state<string | null>(null);
  let relatedAddingKey = $state<string | null>(null);

  const libraryId = $derived(Number(page.params.id));

  const tvCatalog = $derived(
    row?.media_type === "tv" && row.metadata_json != null ? tmdbTvCatalogFromMetadata(row.metadata_json) : null,
  );

  const hasTmdbKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));

  function hitKey(h: { mediaType: string; id: number }): string {
    return `${h.mediaType}-${h.id}`;
  }

  $effect(() => {
    const id = libraryId;
    if (!Number.isFinite(id)) return;
    void (async () => {
      loading = true;
      err = null;
      try {
        const db = await getDatabase();
        row = await getLibraryEntryById(db, id);
        posterUrl = row ? await resolvePosterDisplayUrl(row.poster_local_path, row.image_url) : null;
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });

  $effect(() => {
    const r = row;
    const keyOk = hasTmdbKey;
    if (!keyOk || !r || r.source !== "tmdb") {
      relatedHits = [];
      relatedPresence.clear();
      relatedLoading = false;
      relatedErr = null;
      relatedMsg = null;
      return;
    }
    const tid = Number(r.external_id);
    const mt = r.media_type;
    if (!Number.isFinite(tid) || (mt !== "movie" && mt !== "tv")) {
      relatedHits = [];
      relatedPresence.clear();
      return;
    }

    let cancelled = false;
    relatedLoading = true;
    relatedErr = null;

    void (async () => {
      try {
        const apiKey = getTmdbApiKeyFromEnv();
        const client = createTmdbClient({ apiKey });
        const [rec, sim] =
          mt === "movie"
            ? await Promise.all([client.getMovieRecommendations(tid), client.getMovieSimilar(tid)])
            : await Promise.all([client.getTvRecommendations(tid), client.getTvSimilar(tid)]);
        const merged = mergeRelatedTmdbHits([rec, sim], {
          cap: RELATED_TMDB_HITS_CAP,
          excludeMediaType: mt,
          excludeId: tid,
        });
        const db = await getDatabase();
        const presence = await getTmdbHitsLibraryPresence(db, merged);
        const withThumbs: RelatedRow[] = await Promise.all(
          merged.map(async (h) => ({
            ...h,
            thumb: await resolvePosterDisplayUrl(null, client.posterUrlFromPath(h.posterPath)),
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

  async function refresh() {
    if (!row || row.source !== "tmdb") return;
    busy = true;
    err = null;
    try {
      const key = getTmdbApiKeyFromEnv();
      const client = createTmdbClient({ apiKey: key });
      const db = await getDatabase();
      await refreshTmdbCatalogFlow(db, client, row.catalog_item_id);
      row = await getLibraryEntryById(db, libraryId);
      posterUrl = row ? await resolvePosterDisplayUrl(row.poster_local_path, row.image_url) : null;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function addRelatedWithStatus(hit: RelatedRow, status: Status) {
    if (!hasTmdbKey) return;
    const rk = hitKey(hit);
    relatedAddingKey = rk;
    relatedErr = null;
    relatedMsg = null;
    try {
      const db = await getDatabase();
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const r = await addTmdbHitToLibraryFlow(db, client, hit, status);
      relatedPresence.set(rk, r.libraryId);
      relatedMsg = r.alreadyInLibrary ? t("search.already") : t("detail.related_added");
    } catch (e) {
      relatedErr = e instanceof Error ? e.message : String(e);
    } finally {
      relatedAddingKey = null;
    }
  }
</script>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-8">
  <p>
    <a class="text-sm text-emerald-700 hover:underline dark:text-emerald-400" href={resolve("/library")}>{t("common.back")}</a>
  </p>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if err && !row}
    <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
  {:else if !row}
    <p class="text-sm text-zinc-600">{t("common.error")}</p>
  {:else}
    <header class="flex gap-4">
      {#if posterUrl}
        <img src={posterUrl} alt="" class="h-36 w-24 shrink-0 rounded object-cover" />
      {:else}
        <div class="h-36 w-24 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
      {/if}
      <div class="min-w-0">
        <h1 class="text-xl font-semibold">{row.title}</h1>
        <p class="text-sm text-zinc-500">{mediaLabel(row.media_type)} · {statusLabel(row.status)}</p>
        {#if row.score != null}
          <p class="mt-1 text-sm">{t("detail.score")}: {row.score}/10</p>
        {/if}
      </div>
    </header>

    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    {#if row.media_type === "tv"}
      <section class="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <p class="font-medium">{t("detail.progress_tv")}</p>
        <p>{t("detail.season")}: {row.current_season ?? "—"}</p>
        <p>{t("detail.episode")}: {row.last_episode_watched ?? "—"}</p>
        {#if tvCatalog}
          <div class="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("detail.catalog_tmdb")}</p>
            {#if tvCatalog.numberOfSeasons != null}
              <p class="mt-1">{t("detail.seasons_total")}: {tvCatalog.numberOfSeasons}</p>
            {/if}
            {#if tvCatalog.numberOfEpisodes != null}
              <p>{t("detail.episodes_total")}: {tvCatalog.numberOfEpisodes}</p>
            {/if}
            {#if tvCatalog.showStatus}
              <p>{t("detail.show_status")}: {tvCatalog.showStatus}</p>
            {/if}
          </div>
        {:else if row.source === "tmdb"}
          <p class="mt-2 text-xs text-zinc-500">{t("detail.refresh_for_seasons")}</p>
        {/if}
      </section>
    {/if}

    {#if row.source === "tmdb" && hasTmdbKey}
      <section
        class="rounded-lg border border-zinc-200 dark:border-zinc-800"
        aria-label={t("detail.related_heading")}
      >
        <h2 class="border-b border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
          {t("detail.related_heading")}
        </h2>
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
            class="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
          >
            {#each relatedHits as h (hitKey(h))}
              {@const rk = hitKey(h)}
              {@const libId = relatedPresence.get(rk) ?? null}
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
                        : resolve("/search/[mediaType]/[id]", { mediaType: h.mediaType, id: String(h.id) })}
                      aria-label={libId != null ? t("detail.related_open_aria") : t("detail.related_open_tmdb")}
                      title={libId != null ? t("detail.related_open") : undefined}
                      onclick={(e) => e.stopPropagation()}
                    >
                      {h.title}
                    </a>
                    <p class="mt-0.5 truncate text-[9px] text-white/90">
                      {h.mediaType}{#if h.yearLabel} · {h.yearLabel}{/if}
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
                      <TmdbAddMenuButton
                        menuId={`related-${rk}`}
                        variant="compact"
                        busy={relatedAddingKey === rk}
                        disabled={!hasTmdbKey}
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
    {/if}

    {#if row.notes}
      <section class="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <p class="font-medium">{t("detail.notes")}</p>
        <p class="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{row.notes}</p>
      </section>
    {/if}

    <p class="text-xs text-zinc-500">
      {t("detail.source")}: {row.source} · {t("detail.external_id")}: {row.external_id}
    </p>

    <div class="flex flex-wrap gap-2">
      {#if row.source === "tmdb"}
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
          disabled={busy}
          onclick={() => void refresh()}
        >
          {t("detail.refresh_tmdb")}
        </button>
      {/if}
      <button
        type="button"
        class="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        onclick={() => void goto(resolve("/library/[id]/edit", { id: String(libraryId) }))}
      >
        {t("detail.edit")}
      </button>
    </div>
  {/if}
</div>
