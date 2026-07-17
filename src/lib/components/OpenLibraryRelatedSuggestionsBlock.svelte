<script lang="ts">
  import { createOpenLibraryClient, type OpenLibrarySearchHit } from "$lib/api";
  import { SvelteMap } from "svelte/reactivity";
  import RelatedSuggestionsBlock, {
    type RelatedSuggestionRow,
  } from "$lib/components/RelatedSuggestionsBlock.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { getOpenLibraryHitsLibraryPresence } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { t } from "$lib/i18n";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import {
    mergeRelatedOpenLibraryHits,
    RELATED_OPEN_LIBRARY_HITS_CAP,
  } from "$lib/library/openLibraryRelatedHits";
  import { addOpenLibrarySearchHitToLibrary } from "$lib/library/sources/registry";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  const PREVIEW_CAP = 12;

  interface Props {
    editionId: string;
  }

  let { editionId }: Props = $props();

  let hitsByKey = new SvelteMap<string, OpenLibrarySearchHit>();
  let allRowsCache = $state<RelatedSuggestionRow[]>([]);

  async function mapHits(merged: OpenLibrarySearchHit[]): Promise<RelatedSuggestionRow[]> {
    const db = await getDatabase();
    const presence = await getOpenLibraryHitsLibraryPresence(
      db,
      merged.map((h) => ({ editionId: h.editionId })),
    );
    return Promise.all(
      merged.map(async (h) => {
        hitsByKey.set(h.editionId, h);
        const libId = presence.get(h.editionId) ?? null;
        return {
          key: h.editionId,
          title: h.title,
          thumb: await resolvePosterDisplayUrl(null, h.coverUrl),
          subtitle: (h.authors[0] ?? "") + (h.year ? ` · ${h.year}` : ""),
          libraryId: libId,
          detailTarget:
            libId != null
              ? { kind: "library" as const, id: libId }
              : { kind: "book" as const, editionId: h.editionId },
          detailAriaNew: t("detail.related_openlibrary_open"),
          detailAriaInLibrary: t("detail.related_open_aria"),
          openInLibraryTitle: t("detail.related_in_library") + " · " + t("detail.related_open"),
        };
      }),
    );
  }

  async function loadRows(): Promise<RelatedSuggestionRow[]> {
    hitsByKey = new SvelteMap();
    allRowsCache = [];
    const eid = editionId.replace(/^\/books\//, "");
    if (!/^OL[\dA-Z]+M$/i.test(eid)) return [];

    const client = createOpenLibraryClient();
    const raw = await client.getRelatedEditionHits(eid);
    const merged = mergeRelatedOpenLibraryHits([raw], {
      cap: RELATED_OPEN_LIBRARY_HITS_CAP,
      excludeEditionId: eid,
    });
    allRowsCache = await mapHits(merged);
    return allRowsCache.slice(0, PREVIEW_CAP);
  }

  async function loadMoreRows(_current: RelatedSuggestionRow[]): Promise<RelatedSuggestionRow[]> {
    return allRowsCache;
  }

  async function onAdd(row: RelatedSuggestionRow, status: Status) {
    const hit = hitsByKey.get(row.key);
    if (!hit) return;
    const db = await getDatabase();
    const r = await addOpenLibrarySearchHitToLibrary(db, hit, status);
    afterLibraryChanged();
    return r;
  }

  const canSeeMore = $derived(allRowsCache.length > PREVIEW_CAP);
</script>

{#key editionId}
<RelatedSuggestionsBlock
  ariaLabel={t("detail.related_openlibrary_heading")}
  heading={t("detail.related_openlibrary_heading")}
  subtitle={t("detail.related_openlibrary_subtitle")}
  emptyLabel={t("detail.related_empty")}
  loadingLabel={t("detail.related_loading")}
  inLibraryLabel={t("detail.related_in_library")}
  openAriaLabel={t("detail.related_open_aria")}
  openLabel={t("detail.related_open")}
  canSeeMore={canSeeMore || allRowsCache.length > 0}
  {loadRows}
  {loadMoreRows}
  {onAdd}
/>
{/key}
