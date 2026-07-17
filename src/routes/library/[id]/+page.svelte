<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { createOpenLibraryClient, getTmdbApiKeyFromEnv } from "$lib/api";
  import BookDetailPanel from "$lib/components/library/BookDetailPanel.svelte";
  import LibraryDetailActions from "$lib/components/library/LibraryDetailActions.svelte";
  import LibraryStatusChip from "$lib/components/library/LibraryStatusChip.svelte";
  import TvProgressPanel from "$lib/components/library/TvProgressPanel.svelte";
  import OpenLibraryRelatedSuggestionsBlock from "$lib/components/OpenLibraryRelatedSuggestionsBlock.svelte";
  import TmdbRelatedSuggestionsBlock from "$lib/components/TmdbRelatedSuggestionsBlock.svelte";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, updateLibraryEntry, type LibraryListRow } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { labelForMedia } from "$lib/i18n/labels";
  import { t } from "$lib/i18n";
  import { deleteLibraryEntryWithAssets } from "$lib/library/deleteEntryFlow";
  import { nextEpisode } from "$lib/library/quickEditPatch";
  import { readSyncFolder } from "$lib/stores/syncFolder";
  import { bookCatalogFromMetadata } from "$lib/library/openLibraryCatalogMeta";
  import {
    needsOpenLibraryCoverRepair,
    repairOpenLibraryCoverFlow,
  } from "$lib/library/openLibraryFlow";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { refreshCatalogItem } from "$lib/library/sources/registry";
  import { tmdbTvCatalogFromMetadata } from "$lib/library/tmdbCatalogMeta";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { logError } from "$lib/logs/runtimeLogs";

  let row = $state<LibraryListRow | null>(null);
  let posterUrl = $state<string | null>(null);
  let loading = $state(true);
  let busy = $state(false);
  let deleteConfirmOpen = $state(false);
  let err = $state<string | null>(null);
  let okMsg = $state<string | null>(null);

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

  async function applyPatch(
    patch: Parameters<typeof updateLibraryEntry>[2],
    successMsg: string,
  ) {
    if (!row) return;
    busy = true;
    err = null;
    okMsg = null;
    try {
      const db = await getDatabase();
      await updateLibraryEntry(db, row.id, patch);
      afterLibraryChanged();
      await reloadRow();
      okMsg = successMsg;
    } catch (e) {
      logError("detail.quick_edit", e);
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function onStatusChange(status: Status) {
    await applyPatch({ status }, t("quick_edit.saved_status"));
  }

  async function onSaveTvProgress(patch: {
    current_season: number | null;
    last_episode_watched: number | null;
  }) {
    await applyPatch(patch, t("quick_edit.saved_progress"));
  }

  async function onBumpEpisode() {
    if (!row) return;
    const next = nextEpisode(row.last_episode_watched);
    await applyPatch(
      {
        current_season: row.current_season,
        last_episode_watched: next,
      },
      t("quick_edit.saved_episode").replace("{n}", String(next)),
    );
  }

  async function onSaveBookProgress(patch: {
    progress_current: number | null;
    progress_total: number | null;
  }) {
    await applyPatch(patch, t("quick_edit.saved_progress"));
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
      await deleteLibraryEntryWithAssets(db, libraryId, { syncDir: readSyncFolder() });
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
      <div class="min-w-0 space-y-2">
        <h1 class="text-xl font-semibold">{row.title}</h1>
        <p class="text-sm text-zinc-500">{labelForMedia(row.media_type)}</p>
        <LibraryStatusChip status={row.status as Status} {busy} onChange={onStatusChange} />
        {#if row.score != null}
          <p class="text-sm">{t("detail.score")}: {row.score}/10</p>
        {/if}
      </div>
    </header>

    {#if okMsg}
      <p class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100" role="status">
        {okMsg}
      </p>
    {/if}
    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    {#if row.media_type === "book" && bookCatalog}
      <BookDetailPanel
        {bookCatalog}
        progressCurrent={row.progress_current}
        progressTotal={row.progress_total}
        {busy}
        onSaveProgress={onSaveBookProgress}
      />
    {/if}

    {#if row.media_type === "tv"}
      <TvProgressPanel
        {row}
        {tvCatalog}
        {busy}
        onSaveProgress={onSaveTvProgress}
        onBumpEpisode={onBumpEpisode}
      />
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
