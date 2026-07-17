<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { updateLibraryEntry, type LibraryListRow } from "$lib/db";
  import type { Status } from "$lib/db/types";
  import { STATUSES } from "$lib/db/types";
  import { t } from "$lib/i18n";
  import { labelForStatus } from "$lib/i18n/labels";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { logError } from "$lib/logs/runtimeLogs";

  interface Props {
    open: boolean;
    row: LibraryListRow | null;
    onClose: () => void;
    onSaved: () => void;
  }

  let { open, row, onClose, onSaved }: Props = $props();

  let saving = $state(false);
  let err = $state<string | null>(null);
  let status = $state<Status>("planning");
  let season = $state("");
  let episode = $state("");

  $effect(() => {
    if (!open || !row) return;
    status = row.status as Status;
    season = row.current_season != null ? String(row.current_season) : "";
    episode = row.last_episode_watched != null ? String(row.last_episode_watched) : "";
    err = null;
  });

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  afterNavigate(() => {
    if (open) onClose();
  });

  function parseIntOrNull(v: string): number | null {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
  }

  async function save(patch: {
    status?: Status;
    current_season?: number | null;
    last_episode_watched?: number | null;
  }) {
    if (!row) return;
    saving = true;
    err = null;
    try {
      const db = await getDatabase();
      await updateLibraryEntry(db, row.id, patch);
      afterLibraryChanged();
      onSaved();
      onClose();
    } catch (e) {
      logError("quick_edit.save", e);
      err = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  async function onStatusClick(st: Status) {
    status = st;
    await save({ status: st });
  }

  async function saveTvProgress() {
    if (!row || row.media_type !== "tv") return;
    await save({
      current_season: parseIntOrNull(season),
      last_episode_watched: parseIntOrNull(episode),
    });
  }

  async function bumpEpisode() {
    if (!row || row.media_type !== "tv") return;
    const cur = parseIntOrNull(episode) ?? row.last_episode_watched ?? 0;
    episode = String(cur + 1);
    await save({
      current_season: parseIntOrNull(season) ?? row.current_season,
      last_episode_watched: cur + 1,
    });
  }
</script>

{#if open && row}
  <div class="fixed inset-0 z-50" data-testid="quick-edit-sheet">
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label={t("common.close")}
      onclick={onClose}
    ></button>
    <div
      class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-zinc-200 bg-zinc-50 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label={t("quick_edit.title")}
    >
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true"></div>
      <div class="space-y-4 px-4 pb-2">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("quick_edit.title")}</p>
          <h2 class="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">{row.title}</h2>
        </div>

        {#if err}
          <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
        {/if}

        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-500">{t("edit.status")}</p>
          <ul class="flex flex-col gap-1">
            {#each STATUSES as st (st)}
              <li>
                <button
                  type="button"
                  class="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium transition-colors {status ===
                  st
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-800 hover:bg-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800'}"
                  disabled={saving}
                  onclick={() => void onStatusClick(st)}
                >
                  {labelForStatus(st)}
                </button>
              </li>
            {/each}
          </ul>
        </div>

        {#if row.media_type === "tv"}
          <div class="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <label class="block text-sm">
              <span class="text-zinc-600 dark:text-zinc-400">{t("edit.current_season")}</span>
              <input type="number" min="0" class="shelf-field mt-1" bind:value={season} disabled={saving} />
            </label>
            <label class="block text-sm">
              <span class="text-zinc-600 dark:text-zinc-400">{t("edit.last_episode")}</span>
              <input type="number" min="0" class="shelf-field mt-1" bind:value={episode} disabled={saving} />
            </label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="shelf-btn-primary w-full sm:w-auto"
                disabled={saving}
                onclick={() => void saveTvProgress()}
              >
                {saving ? t("quick_edit.saving") : t("common.save")}
              </button>
              <button
                type="button"
                class="shelf-touch inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 sm:w-auto"
                disabled={saving}
                onclick={() => void bumpEpisode()}
              >
                {t("quick_edit.episode_plus")}
              </button>
            </div>
          </div>
        {/if}

        <a
          class="flex min-h-11 items-center justify-center rounded-md text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/library/[id]/edit", { id: String(row.id) })}
          onclick={onClose}
        >
          {t("quick_edit.full_edit")}
        </a>
      </div>
    </div>
  </div>
{/if}
