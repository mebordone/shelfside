<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import {
    createTmdbClient,
    getTmdbApiKeyFromEnv,
    type TmdbDetail,
    type TmdbSearchHit,
  } from "$lib/api";
  import TmdbAddMenuButton from "$lib/components/TmdbAddMenuButton.svelte";
  import TmdbRelatedSuggestionsBlock from "$lib/components/TmdbRelatedSuggestionsBlock.svelte";
  import type { Status } from "$lib/db/types";
  import { getDatabase } from "$lib/db/connection";
  import { t } from "$lib/i18n/es";
  import { addTmdbHitToLibraryFlow } from "$lib/library/tmdbFlow";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { searchSession } from "$lib/stores/searchSession.svelte";

  let loading = $state(true);
  let err = $state<string | null>(null);
  let detail = $state<TmdbDetail | null>(null);
  let posterUrl = $state<string | null>(null);
  let adding = $state(false);

  const hasKey = $derived(Boolean(getTmdbApiKeyFromEnv().trim()));
  const mediaType = $derived(page.params.mediaType ?? "");
  const rawId = $derived(page.params.id ?? "");
  const tmdbId = $derived(Number(rawId));
  const paramsValid = $derived(
    (mediaType === "movie" || mediaType === "tv") && Number.isFinite(tmdbId) && tmdbId > 0,
  );

  const detailMenuId = $derived(
    paramsValid ? `search-detail-${mediaType}-${tmdbId}` : "search-detail-invalid",
  );

  function yearFromDetail(d: TmdbDetail): string | null {
    try {
      const o = JSON.parse(d.rawJson) as { release_date?: string; first_air_date?: string };
      const date = d.mediaType === "movie" ? o.release_date : o.first_air_date;
      return date && date.length >= 4 ? date.slice(0, 4) : null;
    } catch {
      return null;
    }
  }

  function hitFromDetail(d: TmdbDetail): TmdbSearchHit {
    return {
      mediaType: d.mediaType,
      id: d.id,
      title: d.title,
      overview: d.overview,
      posterPath: d.posterPath,
      yearLabel: yearFromDetail(d),
    };
  }

  const yearLabel = $derived(detail ? yearFromDetail(detail) : null);

  $effect(() => {
    if (!hasKey) {
      loading = false;
      err = t("search.need_key");
      detail = null;
      posterUrl = null;
      return;
    }
    if (!paramsValid) {
      loading = false;
      err = t("search.invalid_link");
      detail = null;
      posterUrl = null;
      return;
    }
    const mt = mediaType as "movie" | "tv";
    const id = tmdbId;
    loading = true;
    err = null;
    detail = null;
    posterUrl = null;
    void (async () => {
      try {
        const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
        const d = mt === "movie" ? await client.getMovieDetail(id) : await client.getTvDetail(id);
        detail = d;
        posterUrl = await resolvePosterDisplayUrl(null, client.posterUrlFromPath(d.posterPath));
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });

  async function addToLibrary(status: Status) {
    if (!detail || !hasKey) return;
    adding = true;
    err = null;
    try {
      const db = await getDatabase();
      const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
      const r = await addTmdbHitToLibraryFlow(db, client, hitFromDetail(detail), status);
      if (r.alreadyInLibrary) {
        searchSession.msg = t("search.already");
        await goto(resolve("/search"));
      } else {
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      adding = false;
    }
  }
</script>

<div class="mx-auto max-w-lg space-y-6 px-4 py-8">
  <p>
    <a
      class="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
      href={resolve("/search")}>{t("search.back_search")}</a
    >
  </p>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if err && !detail}
    <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
  {:else if detail}
    <article class="space-y-4">
      <div class="flex gap-4">
        {#if posterUrl}
          <img src={posterUrl} alt="" class="h-40 w-28 shrink-0 rounded object-cover" />
        {:else}
          <div class="h-40 w-28 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
        {/if}
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-semibold leading-tight">{detail.title}</h1>
          <p class="mt-1 text-sm text-zinc-500">
            {t(`media.${detail.mediaType}`)}{#if yearLabel} · {yearLabel}{/if}
          </p>
          <div class="mt-3">
            <TmdbAddMenuButton
              menuId={detailMenuId}
              variant="row"
              busy={adding}
              disabled={!hasKey}
              onAdd={(status) => addToLibrary(status)}
            />
          </div>
        </div>
      </div>

      {#if err}
        <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
      {/if}

      {#if detail.overview}
        <div>
          <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("search.overview")}</h2>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{detail.overview}</p>
        </div>
      {/if}

      {#if hasKey && paramsValid}
        <TmdbRelatedSuggestionsBlock mediaType={mediaType as "movie" | "tv"} tmdbId={tmdbId} />
      {/if}
    </article>
  {/if}
</div>
