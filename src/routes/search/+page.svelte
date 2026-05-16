<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { createTmdbClient, getTmdbApiKeyFromEnv, type TmdbSearchHit } from "$lib/api";
  import { getDatabase } from "$lib/db/connection";
  import { addTmdbHitToLibraryFlow } from "$lib/library/tmdbFlow";
  import { t } from "$lib/i18n/es";
  import { resolvePosterDisplayUrl } from "$lib/poster";

  let query = $state("");
  let hits = $state<(TmdbSearchHit & { thumb: string | null })[]>([]);
  let loading = $state(false);
  let err = $state<string | null>(null);
  let msg = $state<string | null>(null);

  const hasKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));

  async function runSearch() {
    if (!hasKey) {
      err = t("search.need_key");
      return;
    }
    loading = true;
    err = null;
    msg = null;
    try {
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const raw = await client.searchMulti(query);
      hits = await Promise.all(
        raw.map(async (h) => ({
          ...h,
          thumb: await resolvePosterDisplayUrl(null, client.posterUrlFromPath(h.posterPath)),
        })),
      );
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      hits = [];
    } finally {
      loading = false;
    }
  }

  async function addHit(hit: TmdbSearchHit) {
    if (!hasKey) return;
    err = null;
    msg = null;
    try {
      const db = await getDatabase();
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const r = await addTmdbHitToLibraryFlow(db, client, hit);
      if (r.alreadyInLibrary) {
        msg = t("search.already");
      } else {
        msg = t("search.added");
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-8">
  <h1 class="text-2xl font-semibold">{t("search.title")}</h1>

  {#if !hasKey}
    <p class="text-sm text-amber-700 dark:text-amber-400">{t("search.need_key")}</p>
  {/if}

  <form
    class="flex flex-wrap gap-2"
    onsubmit={(e) => {
      e.preventDefault();
      void runSearch();
    }}
  >
    <input
      class="min-w-[12rem] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
      placeholder={t("search.query_placeholder")}
      bind:value={query}
    />
    <button
      type="submit"
      class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      disabled={loading || !query.trim()}
    >
      {t("search.submit")}
    </button>
  </form>

  {#if err}
    <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
  {/if}
  {#if msg}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if hits.length === 0 && query.trim() && hasKey}
    <p class="text-sm text-zinc-600">{t("search.empty")}</p>
  {:else if hits.length > 0}
    <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("search.results")}</h2>
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each hits as h (h.mediaType + "-" + String(h.id))}
        <li class="flex gap-3 bg-white p-3 dark:bg-zinc-900">
          {#if h.thumb}
            <img src={h.thumb} alt="" class="h-20 w-14 shrink-0 rounded object-cover" />
          {:else}
            <div class="h-20 w-14 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          {/if}
          <div class="min-w-0 flex-1">
            <p class="font-medium">{h.title}</p>
            <p class="text-xs text-zinc-500">{h.mediaType}{#if h.yearLabel} · {h.yearLabel}{/if}</p>
            <button
              type="button"
              class="mt-2 rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
              onclick={() => void addHit(h)}
            >
              {t("search.add")}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
