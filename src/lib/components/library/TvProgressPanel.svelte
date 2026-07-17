<script lang="ts">
  import type { LibraryListRow } from "$lib/db";
  import type { TmdbTvCatalogFields } from "$lib/library/tmdbCatalogMeta";
  import {
    isValidNonNegativeIntInput,
    parseNonNegativeIntOrNull,
  } from "$lib/library/quickEditPatch";
  import { t } from "$lib/i18n";

  interface Props {
    row: LibraryListRow;
    tvCatalog: TmdbTvCatalogFields | null;
    busy?: boolean;
    onSaveProgress: (patch: {
      current_season: number | null;
      last_episode_watched: number | null;
    }) => void | Promise<void>;
    onBumpEpisode: () => void | Promise<void>;
  }

  let { row, tvCatalog, busy = false, onSaveProgress, onBumpEpisode }: Props = $props();

  let editing = $state<"season" | "episode" | null>(null);
  let seasonDraft = $state("");
  let episodeDraft = $state("");
  let localErr = $state<string | null>(null);

  function openSeason() {
    if (busy) return;
    localErr = null;
    seasonDraft = row.current_season != null ? String(row.current_season) : "";
    episodeDraft = row.last_episode_watched != null ? String(row.last_episode_watched) : "";
    editing = "season";
  }

  function openEpisode() {
    if (busy) return;
    localErr = null;
    seasonDraft = row.current_season != null ? String(row.current_season) : "";
    episodeDraft = row.last_episode_watched != null ? String(row.last_episode_watched) : "";
    editing = "episode";
  }

  function closeEdit() {
    editing = null;
    localErr = null;
  }

  const canSave = $derived(
    isValidNonNegativeIntInput(seasonDraft) && isValidNonNegativeIntInput(episodeDraft),
  );

  async function save() {
    if (!canSave || busy) return;
    const season = parseNonNegativeIntOrNull(seasonDraft);
    const episode = parseNonNegativeIntOrNull(episodeDraft);
    if (season === undefined || episode === undefined) {
      localErr = t("quick_edit.invalid_number");
      return;
    }
    localErr = null;
    await onSaveProgress({ current_season: season, last_episode_watched: episode });
    closeEdit();
  }

  function bumpDraft(delta: number) {
    const cur = parseNonNegativeIntOrNull(episodeDraft);
    const base = cur === undefined || cur === null ? 0 : cur;
    episodeDraft = String(Math.max(0, base + delta));
  }
</script>

<section class="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800" data-testid="tv-progress-panel">
  <p class="font-medium">{t("detail.progress_tv")}</p>

  {#if editing}
    <div class="mt-3 space-y-3">
      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.season")}</span>
        <input
          type="number"
          min="0"
          inputmode="numeric"
          class="shelf-field mt-1 min-h-11"
          bind:value={seasonDraft}
          disabled={busy}
        />
      </label>
      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.episode")}</span>
        <div class="mt-1 flex gap-2">
          <button
            type="button"
            class="shelf-touch inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-300 text-lg dark:border-zinc-600"
            disabled={busy}
            aria-label={t("quick_edit.episode_minus")}
            onclick={() => bumpDraft(-1)}
          >
            −
          </button>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            class="shelf-field min-h-11 flex-1"
            bind:value={episodeDraft}
            disabled={busy}
          />
          <button
            type="button"
            class="shelf-touch inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-300 text-lg dark:border-zinc-600"
            disabled={busy}
            aria-label={t("quick_edit.episode_plus_one")}
            onclick={() => bumpDraft(1)}
          >
            +
          </button>
        </div>
      </label>
      {#if localErr}
        <p class="text-sm text-red-600 dark:text-red-400">{localErr}</p>
      {/if}
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="shelf-btn-primary"
          disabled={busy || !canSave}
          onclick={() => void save()}
        >
          {busy ? t("quick_edit.saving") : t("common.save")}
        </button>
        <button
          type="button"
          class="shelf-touch inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
          disabled={busy}
          onclick={closeEdit}
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  {:else}
    <div class="mt-2 space-y-2">
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800/80"
        disabled={busy}
        onclick={openSeason}
      >
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.season")}</span>
        <span class="tabular-nums font-medium text-emerald-800 dark:text-emerald-300"
          >{row.current_season ?? "—"}</span
        >
      </button>
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 text-left hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800/80"
        disabled={busy}
        onclick={openEpisode}
      >
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.episode")}</span>
        <span class="tabular-nums font-medium text-emerald-800 dark:text-emerald-300"
          >{row.last_episode_watched ?? "—"}</span
        >
      </button>
      <button
        type="button"
        class="shelf-btn-primary w-full"
        disabled={busy}
        onclick={() => void onBumpEpisode()}
      >
        {t("quick_edit.episode_plus")}
      </button>
    </div>
  {/if}

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
