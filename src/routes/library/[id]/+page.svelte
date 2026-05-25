<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { createOpenLibraryClient, getTmdbApiKeyFromEnv } from "$lib/api";
  import BookDetailPanel from "$lib/components/library/BookDetailPanel.svelte";
  import LibraryDetailActions from "$lib/components/library/LibraryDetailActions.svelte";
  import TvProgressPanel from "$lib/components/library/TvProgressPanel.svelte";
  import OpenLibraryRelatedSuggestionsBlock from "$lib/components/OpenLibraryRelatedSuggestionsBlock.svelte";
  import TmdbRelatedSuggestionsBlock from "$lib/components/TmdbRelatedSuggestionsBlock.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, type LibraryListRow } from "$lib/db";
  import { labelForMedia, labelForStatus } from "$lib/i18n/labels";
  import { t } from "$lib/i18n";
  import { deleteLibraryEntryWithAssets } from "$lib/library/deleteEntryFlow";
  import { bookCatalogFromMetadata } from "$lib/library/openLibraryCatalogMeta";
  import {
    needsOpenLibraryCoverRepair,
    repairOpenLibraryCoverFlow,
  } from "$lib/library/openLibraryFlow";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { refreshCatalogItem } from "$lib/library/sources/registry";
  import { tmdbTvCatalogFromMetadata } from "$lib/library/tmdbCatalogMeta";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  let row = $state<LibraryListRow | null>(null);
  let posterUrl = $state<string | null>(null);
  let loading = $state(true);
  let busy = $state(false);
  let deleteConfirmOpen = $state(false);
  let err = $state<string | null>(null);

  const libraryId = $derived(Number(page.params.id));

  const tvCatalog = $derived(
    row?.media_type === "tv" && row.metadata_json != null ? tmdbTvCatalogFromMetadata(row.metadata_json) : null,
  );

  const bookCatalog = $derived(
    row?.media_type === "book" && row.metadata_json != null ? bookCatalogFromMetadata(row.metadata_json) : null,
  );

  const hasTmdbKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));

  const showRepairCover = $derived(
    row?.source === "openlibrary" &&
      row.media_type === "book" &&
      (needsOpenLibraryCoverRepair(row.image_url) || !posterUrl),
  );

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

  async function reloadRow() {
    const db = await getDatabase();
    row = await getLibraryEntryById(db, libraryId);
    posterUrl = row ? await resolvePosterDisplayUrl(row.poster_local_path, row.image_url) : null;
  }

  async function refreshCatalog() {
    if (!row) return;
    busy = true;
    err = null;
    try {
      const db = await getDatabase();
      await refreshCatalogItem(db, row.source, row.catalog_item_id);
      await reloadRow();
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function repairCover() {
    if (!row || row.source !== "openlibrary") return;
    busy = true;
    err = null;
    try {
      const db = await getDatabase();
      const client = createOpenLibraryClient();
      await repairOpenLibraryCoverFlow(db, client, row.catalog_item_id);
      await reloadRow();
      afterLibraryChanged();
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function confirmDelete() {
    if (!row) return;
    busy = true;
    err = null;
    try {
      const db = await getDatabase();
      await deleteLibraryEntryWithAssets(db, libraryId);
      afterLibraryChanged();
      await goto(resolve("/library"));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      busy = false;
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
        <p class="text-sm text-zinc-500">{labelForMedia(row.media_type)} · {labelForStatus(row.status)}</p>
        {#if row.score != null}
          <p class="mt-1 text-sm">{t("detail.score")}: {row.score}/10</p>
        {/if}
      </div>
    </header>

    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    {#if row.media_type === "book" && bookCatalog}
      <BookDetailPanel {bookCatalog} />
    {/if}

    {#if row.media_type === "tv"}
      <TvProgressPanel {row} {tvCatalog} />
    {/if}

    {#if row.source === "tmdb" && hasTmdbKey && (row.media_type === "movie" || row.media_type === "tv")}
      <TmdbRelatedSuggestionsBlock mediaType={row.media_type} tmdbId={Number(row.external_id)} />
    {/if}

    {#if row.source === "openlibrary" && row.media_type === "book"}
      <OpenLibraryRelatedSuggestionsBlock editionId={row.external_id} />
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

    <LibraryDetailActions
      {row}
      {libraryId}
      {busy}
      {deleteConfirmOpen}
      {showRepairCover}
      onRefreshTmdb={() => void refreshCatalog()}
      onRefreshOpenLibrary={() => void refreshCatalog()}
      onRepairCover={() => void repairCover()}
      onDeleteConfirm={() => void confirmDelete()}
      onDeleteCancel={() => {
        deleteConfirmOpen = false;
      }}
      onDeleteOpen={() => {
        deleteConfirmOpen = true;
      }}
    />
  {/if}
</div>
