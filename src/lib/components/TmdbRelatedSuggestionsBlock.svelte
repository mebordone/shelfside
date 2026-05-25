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
  import { mergeRelatedTmdbHits, RELATED_TMDB_HITS_CAP } from "$lib/library/tmdbRelatedHits";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  interface Props {
    mediaType: "movie" | "tv";
    tmdbId: number;
  }

  let { mediaType, tmdbId }: Props = $props();

  const hasTmdbKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));
  let hitsByKey = new SvelteMap<string, TmdbSearchHit>();

  function hitKey(h: { mediaType: string; id: number }): string {
    return `${h.mediaType}-${h.id}`;
  }

  async function loadRows(): Promise<RelatedSuggestionRow[]> {
    hitsByKey = new SvelteMap();
    if (!hasTmdbKey || !Number.isFinite(tmdbId) || tmdbId <= 0) return [];
    const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
    const [rec, sim] =
      mediaType === "movie"
        ? await Promise.all([client.getMovieRecommendations(tmdbId), client.getMovieSimilar(tmdbId)])
        : await Promise.all([client.getTvRecommendations(tmdbId), client.getTvSimilar(tmdbId)]);
    const merged = mergeRelatedTmdbHits([rec, sim], {
      cap: RELATED_TMDB_HITS_CAP,
      excludeMediaType: mediaType,
      excludeId: tmdbId,
    });
    const db = await getDatabase();
    const presence = await getTmdbHitsLibraryPresence(db, merged);
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
              ? { kind: "library", id: libId }
              : { kind: "tmdb", mediaType: h.mediaType, id: h.id },
          detailAriaNew: t("detail.related_open_tmdb"),
          detailAriaInLibrary: t("detail.related_open_aria"),
          openInLibraryTitle: t("detail.related_in_library") + " · " + t("detail.related_open"),
        };
      }),
    );
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
    {loadRows}
    {onAdd}
  />
  {/key}
{/if}
