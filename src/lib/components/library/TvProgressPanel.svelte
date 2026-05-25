<script lang="ts">
  import type { LibraryListRow } from "$lib/db";
  import type { TmdbTvCatalogFields } from "$lib/library/tmdbCatalogMeta";
  import { t } from "$lib/i18n";

  interface Props {
    row: LibraryListRow;
    tvCatalog: TmdbTvCatalogFields | null;
  }

  let { row, tvCatalog }: Props = $props();
</script>

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
