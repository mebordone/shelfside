<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { createTmdbClient, getTmdbApiKeyFromEnv, type TmdbSearchHit } from "$lib/api";
  import { getDatabase } from "$lib/db/connection";
  import { addTmdbHitToLibraryFlow } from "$lib/library/tmdbFlow";
  import { t } from "$lib/i18n/es";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { searchSession } from "$lib/stores/searchSession.svelte";

  let loading = $state(false);

  const hasKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));

  async function runSearch() {
    if (!hasKey) {
      searchSession.err = t("search.need_key");
      return;
    }
    loading = true;
    searchSession.err = null;
    searchSession.msg = null;
    try {
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const raw = await client.searchMulti(searchSession.query);
      searchSession.hits = await Promise.all(
        raw.map(async (h) => ({
          ...h,
          thumb: await resolvePosterDisplayUrl(null, client.posterUrlFromPath(h.posterPath)),
        })),
      );
    } catch (e) {
      searchSession.err = e instanceof Error ? e.message : String(e);
      searchSession.hits = [];
    } finally {
      loading = false;
    }
  }

  async function addHit(hit: TmdbSearchHit) {
    if (!hasKey) return;
    searchSession.err = null;
    searchSession.msg = null;
    try {
      const db = await getDatabase();
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const r = await addTmdbHitToLibraryFlow(db, client, hit);
      if (r.alreadyInLibrary) {
        searchSession.msg = t("search.already");
      } else {
        searchSession.msg = t("search.added");
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      searchSession.err = e instanceof Error ? e.message : String(e);
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
        class="shelf-field min-w-[12rem] flex-1"
      placeholder={t("search.query_placeholder")}
      bind:value={searchSession.query}
    />
    <button
      type="submit"
      class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      disabled={loading || !searchSession.query.trim()}
    >
      {t("search.submit")}
    </button>
  </form>

  {#if searchSession.err}
    <p class="text-sm text-red-600 dark:text-red-400">{searchSession.err}</p>
  {/if}
  {#if searchSession.msg}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{searchSession.msg}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if searchSession.hits.length === 0 && searchSession.query.trim() && hasKey}
    <p class="text-sm text-zinc-600">{t("search.empty")}</p>
  {:else if searchSession.hits.length > 0}
    <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("search.results")}</h2>
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each searchSession.hits as h (h.mediaType + "-" + String(h.id))}
        <li class="flex gap-3 bg-white p-3 dark:bg-zinc-900">
          <a
            class="group flex min-w-0 flex-1 gap-3 rounded-md outline-none ring-emerald-500/40 focus-visible:ring-2"
            href={resolve("/search/[mediaType]/[id]", { mediaType: h.mediaType, id: String(h.id) })}
            aria-label={t("search.aria_open_detail")}
          >
            {#if h.thumb}
              <img src={h.thumb} alt="" class="h-20 w-14 shrink-0 rounded object-cover" />
            {:else}
              <div class="h-20 w-14 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="font-medium group-hover:underline">{h.title}</p>
              <p class="text-xs text-zinc-500">{h.mediaType}{#if h.yearLabel} · {h.yearLabel}{/if}</p>
              <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t("search.open_detail_hint")}</p>
            </div>
          </a>
          <div class="flex shrink-0 flex-col justify-center">
            <button
              type="button"
              class="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
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
