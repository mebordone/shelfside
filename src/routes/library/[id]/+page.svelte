<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, type LibraryListRow } from "$lib/db";
  import { createTmdbClient, getTmdbApiKeyFromEnv } from "$lib/api";
  import { refreshTmdbCatalogFlow } from "$lib/library/tmdbFlow";
  import { tmdbTvCatalogFromMetadata } from "$lib/library/tmdbCatalogMeta";
  import { t } from "$lib/i18n/es";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  let row = $state<LibraryListRow | null>(null);
  let posterUrl = $state<string | null>(null);
  let loading = $state(true);
  let busy = $state(false);
  let err = $state<string | null>(null);

  const libraryId = $derived(Number(page.params.id));

  const tvCatalog = $derived(
    row?.media_type === "tv" && row.metadata_json != null ? tmdbTvCatalogFromMetadata(row.metadata_json) : null,
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
</script>

<div class="mx-auto max-w-lg space-y-6 px-4 py-8">
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
