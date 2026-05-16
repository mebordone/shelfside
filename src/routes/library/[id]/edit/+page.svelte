<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { getDatabase } from "$lib/db/connection";
  import { getLibraryEntryById, updateLibraryEntry, type LibraryListRow } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { STATUSES } from "$lib/db/types";
  import { t } from "$lib/i18n/es";

  let row = $state<LibraryListRow | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let err = $state<string | null>(null);

  let status = $state<Status>("planning");
  /** `type="number"` puede enlazar `number`; tratamos ambos en los parsers. */
  let scoreStr = $state<string | number>("");
  let notes = $state("");
  let currentSeason = $state<string | number>("");
  let lastEpisode = $state<string | number>("");

  const libraryId = $derived(Number(page.params.id));

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

  function statusLabel(s: string): string {
    const k = `status.${s}`;
    const v = t(k);
    return v === k ? s : v;
  }

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

  function parseOptionalScore(raw: unknown): number | null | "invalid" {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return validatedScore1to10(raw);
    const trimmed = String(raw).trim();
    if (trimmed === "") return null;
    return validatedScore1to10(Number.parseInt(trimmed, 10));
  }

  async function save() {
    if (!row) return;
    saving = true;
    err = null;
    try {
      const scoreParsed = parseOptionalScore(scoreStr);
      if (scoreParsed === "invalid") {
        err = "La puntuación debe ser un entero entre 1 y 10 o estar vacía.";
        return;
      }
      const db = await getDatabase();
      await updateLibraryEntry(db, libraryId, {
        status,
        score: scoreParsed,
        notes: notes.trim() || null,
        current_season: row.media_type === "tv" ? parseIntOrNull(currentSeason) : null,
        last_episode_watched: row.media_type === "tv" ? parseIntOrNull(lastEpisode) : null,
      });
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

  <h1 class="text-xl font-semibold">{t("edit.title")}</h1>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if !row}
    <p class="text-sm text-zinc-600">{t("common.error")}</p>
  {:else}
    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    <form
      class="space-y-4"
      onsubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("edit.status")}</span>
        <select
          class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={status}
        >
          {#each STATUSES as st (st)}
            <option value={st}>{statusLabel(st)}</option>
          {/each}
        </select>
      </label>

      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.score")} ({t("edit.score_hint")})</span>
        <input
          type="number"
          min="1"
          max="10"
          class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={scoreStr}
        />
      </label>

      {#if row.media_type === "tv"}
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.current_season")}</span>
          <input
            type="number"
            min="0"
            class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            bind:value={currentSeason}
          />
        </label>
        <label class="block text-sm">
          <span class="text-zinc-600 dark:text-zinc-400">{t("edit.last_episode")}</span>
          <input
            type="number"
            min="0"
            class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            bind:value={lastEpisode}
          />
        </label>
      {/if}

      <label class="block text-sm">
        <span class="text-zinc-600 dark:text-zinc-400">{t("detail.notes")}</span>
        <textarea
          rows="4"
          class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={notes}
        ></textarea>
      </label>

      <button
        type="submit"
        class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        disabled={saving}
      >
        {t("common.save")}
      </button>
    </form>
  {/if}
</div>
