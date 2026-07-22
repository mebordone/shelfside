<script lang="ts">
  import { createTmdbClient, getTmdbApiKeyFromEnv, type TmdbSearchHit } from "$lib/api";
  import { SvelteMap } from "svelte/reactivity";
  import RelatedSuggestionsBlock, {
    type RelatedSuggestionRow,
  } from "$lib/components/RelatedSuggestionsBlock.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { getTmdbHitsLibraryPresence } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { t } from "$lib/i18n";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { addTmdbSearchHitToLibrary } from "$lib/library/sources/registry";
  import {
    mergeRelatedTmdbHits,
    RELATED_TMDB_HITS_CAP,
    RELATED_TMDB_SHEET_CAP,
  } from "$lib/library/tmdbRelatedHits";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  interface Props {
    mediaType: "movie" | "tv";
    tmdbId: number;
    /** Origen para «Volver» en ficha de catálogo. */
    returnTo?: string | null;
  }

  let { mediaType, tmdbId, returnTo = null }: Props = $props();

  const hasTmdbKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));
  let hitsByKey = new SvelteMap<string, TmdbSearchHit>();
  let sheetPage = $state(1);

  function hitKey(h: { mediaType: string; id: number }): string {
    return `${h.mediaType}-${h.id}`;
  }

  async function mapHits(merged: TmdbSearchHit[]): Promise<RelatedSuggestionRow[]> {
    const db = await getDatabase();
    const presence = await getTmdbHitsLibraryPresence(db, merged);
    const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
    return Promise.all(
      merged.map(async (h) => {
        const rk = hitKey(h);
        hitsByKey.set(rk, h);
        const libId = presence.get(rk) ?? null;
        return {
          key: rk,
          title: h.title,
          thumb: await resolvePosterDisplayUrl(null, client.posterUrlFromPath(h.posterPath)),
          subtitle: h.mediaType + (h.yearLabel ? ` · ${h.yearLabel}` : ""),
          libraryId: libId,
          detailTarget:
            libId != null
              ? { kind: "library" as const, id: libId }
              : { kind: "tmdb" as const, mediaType: h.mediaType, id: h.id },
          detailAriaNew: t("detail.related_open_tmdb"),
          detailAriaInLibrary: t("detail.related_open_aria"),
          openInLibraryTitle: t("detail.related_in_library") + " · " + t("detail.related_open"),
        };
      }),
    );
  }

  async function fetchMergedPage(page: number, cap: number): Promise<TmdbSearchHit[]> {
    const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
    const [rec, sim] =
      mediaType === "movie"
        ? await Promise.all([
            client.getMovieRecommendations(tmdbId, page),
            client.getMovieSimilar(tmdbId, page),
          ])
        : await Promise.all([
            client.getTvRecommendations(tmdbId, page),
            client.getTvSimilar(tmdbId, page),
          ]);
    return mergeRelatedTmdbHits([rec, sim], {
      cap,
      excludeMediaType: mediaType,
      excludeId: tmdbId,
    });
  }

  async function loadRows(): Promise<RelatedSuggestionRow[]> {
    hitsByKey = new SvelteMap();
    sheetPage = 1;
    if (!hasTmdbKey || !Number.isFinite(tmdbId) || tmdbId <= 0) return [];
    const merged = await fetchMergedPage(1, RELATED_TMDB_HITS_CAP);
    return mapHits(merged);
  }

  async function loadMoreRows(current: RelatedSuggestionRow[]): Promise<RelatedSuggestionRow[]> {
    if (!hasTmdbKey || !Number.isFinite(tmdbId) || tmdbId <= 0) return current;
    const remaining = RELATED_TMDB_SHEET_CAP - current.length;
    if (remaining <= 0) return current;

    const nextPage = sheetPage + 1;
    const pageHits = await fetchMergedPage(nextPage, 40);
    const seen = new Set(current.map((r) => r.key));
    const fresh: TmdbSearchHit[] = [];
    for (const h of pageHits) {
      const k = hitKey(h);
      if (seen.has(k)) continue;
      seen.add(k);
      fresh.push(h);
      if (fresh.length >= remaining) break;
    }
    if (fresh.length === 0) return current;
    sheetPage = nextPage;
    const mapped = await mapHits(fresh);
    return [...current, ...mapped];
  }

  async function onAdd(row: RelatedSuggestionRow, status: Status) {
    const hit = hitsByKey.get(row.key);
    if (!hit || !hasTmdbKey) return;
    const db = await getDatabase();
    const r = await addTmdbSearchHitToLibrary(db, hit, status);
    afterLibraryChanged();
    return r;
  }
</script>

{#if Number.isFinite(tmdbId) && tmdbId > 0 && (mediaType === "movie" || mediaType === "tv")}
  {#key `${mediaType}-${tmdbId}`}
  <RelatedSuggestionsBlock
    ariaLabel={t("detail.related_heading")}
    heading={t("detail.related_heading")}
    subtitle={t("detail.related_subtitle")}
    emptyLabel={t("detail.related_empty")}
    loadingLabel={t("detail.related_loading")}
    inLibraryLabel={t("detail.related_in_library")}
    openAriaLabel={t("detail.related_open_aria")}
    openLabel={t("detail.related_open")}
    addDisabled={!hasTmdbKey}
    canSeeMore={hasTmdbKey}
    {returnTo}
    {loadRows}
    {loadMoreRows}
    {onAdd}
  />
  {/key}
{/if}
