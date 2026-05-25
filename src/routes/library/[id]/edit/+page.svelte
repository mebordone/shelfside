<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, updateLibraryEntry, type LibraryListRow } from "$lib/db";
  import { tmdbTvCatalogFromMetadata } from "$lib/library/tmdbCatalogMeta";
  import type { Status } from "$lib/db/types";
  import { STATUSES } from "$lib/db/types";
  import { t } from "$lib/i18n";
  import { labelForStatus } from "$lib/i18n/labels";
  import { afterLibraryChanged } from "$lib/library/mutations";

  const SCORE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

  let row = $state<LibraryListRow | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let err = $state<string | null>(null);

  let status = $state<Status>("planning");
  let scoreStr = $state("");
  let notes = $state("");
  let currentSeason = $state("");
  /** Último episodio: sigue siendo numérico libre (varía por temporada). */
  let lastEpisode = $state<string | number>("");

  const libraryId = $derived(Number(page.params.id));

  const tvCatalog = $derived(
    row?.media_type === "tv" && row.metadata_json != null ? tmdbTvCatalogFromMetadata(row.metadata_json) : null,
  );

  /** Máximo temporada en el desplegable: TMDB, o lo ya guardado, o 40. */
  const seasonMax = $derived.by(() => {
    let cap = 40;
    const tmax = tvCatalog?.numberOfSeasons;
    if (typeof tmax === "number" && tmax > 0) cap = tmax;
    const rs = row?.current_season;
    if (typeof rs === "number" && rs > cap) cap = rs;
    return cap;
  });

  const seasonOptions = $derived(Array.from({ length: seasonMax + 1 }, (_, i) => i));

  $effect(() => {
    const id = libraryId;
    if (!Number.isFinite(id)) return;
    void (async () => {
      loading = true;
      err = null;
      try {
        const db = await getDatabase();
        row = await getLibraryEntryById(db, id);
        if (row) {
          status = row.status as Status;
          scoreStr = row.score != null ? String(row.score) : "";
          notes = row.notes ?? "";
          currentSeason = row.current_season != null ? String(row.current_season) : "";
          lastEpisode = row.last_episode_watched != null ? String(row.last_episode_watched) : "";
        }
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });

  function parseIntOrNull(v: unknown): number | null {
    if (typeof v === "number") {
      if (!Number.isFinite(v) || Number.isNaN(v)) return null;
      return Math.trunc(v);
    }
    const trimmed = String(v ?? "").trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
  }

  /** null = vacío; número 1–10; "invalid" = error de validación */
  function validatedScore1to10(n: number): number | null | "invalid" {
    if (!Number.isFinite(n) || Number.isNaN(n)) return null;
    if (!Number.isInteger(n) || n < 1 || n > 10) return "invalid";
    return n;
  }

  function parseOptionalScore(raw: string): number | null | "invalid" {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number.parseInt(trimmed, 10);
    return validatedScore1to10(n);
  }

  type ParsedEdit = {
    score: number | null;
    current_season: number | null;
    last_episode_watched: number | null;
  };

  /** Resultado de validar y parsear el formulario de edición. */
  function parseEditForSave(
    mediaType: string,
    scoreRaw: string,
    seasonRaw: string,
    lastEpRaw: unknown,
    cat: ReturnType<typeof tmdbTvCatalogFromMetadata>,
  ): { ok: true; data: ParsedEdit } | { ok: false; message: string } {
    const scoreParsed = parseOptionalScore(scoreRaw);
    if (scoreParsed === "invalid") return { ok: false, message: t("edit.score_invalid") };
    const seasonNum = mediaType === "tv" ? parseIntOrNull(seasonRaw) : null;
    const maxS = cat?.numberOfSeasons;
    if (maxS != null && seasonNum != null && seasonNum > maxS) {
      return { ok: false, message: `${t("edit.season_over_catalog")} (${maxS}).` };
    }
    return {
      ok: true,
      data: {
        score: scoreParsed,
        current_season: seasonNum,
        last_episode_watched: mediaType === "tv" ? parseIntOrNull(lastEpRaw) : null,
      },
    };
  }

  async function save() {
    if (!row) return;
    saving = true;
    err = null;
    try {
      const parsed = parseEditForSave(row.media_type, scoreStr, currentSeason, lastEpisode, tvCatalog);
      if (!parsed.ok) {
        err = parsed.message;
        return;
      }
      const db = await getDatabase();
      await updateLibraryEntry(db, libraryId, {
        status,
        score: parsed.data.score,
        notes: notes.trim() || null,
        current_season: parsed.data.current_season,
        last_episode_watched: parsed.data.last_episode_watched,
      });
      afterLibraryChanged();
      await goto(resolve("/library/[id]", { id: String(libraryId) }));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }
</script>

<div class="mx-auto max-w-lg space-y-6 px-4 py-8">
  <p>
    <a
      class="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
      href={resolve("/library/[id]", { id: String(libraryId) })}>{t("common.back")}</a
    >
  </p>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if !row}
    <p class="text-sm text-zinc-600">{t("common.error")}</p>
  {:else}
    <header class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400/90">
        {t("edit.context_label")}
      </p>
      <h1 class="text-xl font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{row.title}</h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("edit.subtitle")}</p>
    </header>

    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    <form
      class="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      onsubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("edit.status")}</span>
        <select class="shelf-field mt-1" bind:value={status}>
          {#each STATUSES as st (st)}
            <option value={st}>{labelForStatus(st)}</option>
          {/each}
        </select>
      </label>

      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.score")} ({t("edit.score_hint")})</span>
        <select class="shelf-field mt-1" bind:value={scoreStr}>
          <option value="">{t("edit.score_empty")}</option>
          {#each SCORE_VALUES as n (n)}
            <option value={String(n)}>{n}</option>
          {/each}
        </select>
      </label>

      {#if row.media_type === "tv"}
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.current_season")}</span>
          <select class="shelf-field mt-1" bind:value={currentSeason}>
            <option value="">{t("edit.season_empty")}</option>
            {#each seasonOptions as s (s)}
              <option value={String(s)}>{s}</option>
            {/each}
          </select>
        </label>
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.last_episode")}</span>
          <input
            type="number"
            min="0"
            class="shelf-field mt-1"
            bind:value={lastEpisode}
          />
        </label>
        {#if tvCatalog}
          <div class="rounded border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
            <p class="font-medium text-zinc-600 dark:text-zinc-400">{t("detail.catalog_tmdb")}</p>
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
          <p class="text-xs text-zinc-500">{t("detail.refresh_for_seasons")}</p>
        {/if}
      {/if}

      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.notes")}</span>
        <textarea rows="4" class="shelf-field mt-1 min-h-[6rem] resize-y" bind:value={notes}></textarea>
      </label>

      <div class="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <button
          type="submit"
          class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={saving}
        >
          {t("common.save")}
        </button>
        {#if saving}
          <span class="text-sm text-zinc-500 dark:text-zinc-400">{t("edit.saving")}</span>
        {/if}
        <a
          class="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          href={resolve("/library/[id]", { id: String(libraryId) })}>{t("common.cancel")}</a
        >
      </div>
    </form>
  {/if}
</div>
