<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { createOpenLibraryClient, type OpenLibrarySearchHit } from "$lib/api";
  import AddToLibraryMenuButton from "$lib/components/AddToLibraryMenuButton.svelte";
  import OpenLibraryRelatedSuggestionsBlock from "$lib/components/OpenLibraryRelatedSuggestionsBlock.svelte";
  import type { Status } from "$lib/db/types";
  import { getDatabase } from "$lib/db/connection";
  import { t } from "$lib/i18n";
  import { addOpenLibrarySearchHitToLibrary } from "$lib/library/sources/registry";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { searchSession } from "$lib/stores/searchSession.svelte";

  let loading = $state(true);
  let err = $state<string | null>(null);
  let detail = $state<Awaited<ReturnType<ReturnType<typeof createOpenLibraryClient>["getEditionDetail"]>> | null>(
    null,
  );
  let posterUrl = $state<string | null>(null);
  let adding = $state(false);

  const editionId = $derived((page.params.editionId ?? "").replace(/^\/books\//, ""));
  const paramsValid = $derived(/^OL[\dA-Z]+M$/i.test(editionId));

  const detailMenuId = $derived(paramsValid ? `search-book-${editionId}` : "search-book-invalid");

  /** Año del listado de búsqueda (evita fallo si /works no trae first_publish_date). */
  const yearFromSearch = $derived.by(() => {
    for (const h of searchSession.hits) {
      if (h.kind === "openlibrary" && h.editionId === editionId) return h.year;
    }
    return undefined;
  });

  function hitFromDetail(): OpenLibrarySearchHit | null {
    if (!detail) return null;
    return {
      editionId: detail.editionId,
      workKey: detail.workKey,
      title: detail.title,
      authors: detail.authors,
      year: detail.year,
      coverUrl: detail.coverUrl,
    };
  }

  $effect(() => {
    const id = editionId;
    if (!paramsValid) {
      loading = false;
      err = t("search.invalid_link");
      detail = null;
      return;
    }
    let cancelled = false;
    loading = true;
    err = null;
    void (async () => {
      try {
        const client = createOpenLibraryClient();
        const d = await client.getEditionDetail(id, { yearHint: yearFromSearch });
        if (cancelled) return;
        detail = d;
        posterUrl = await resolvePosterDisplayUrl(null, d.coverUrl);
      } catch (e) {
        if (!cancelled) {
          err = e instanceof Error ? e.message : String(e);
          detail = null;
        }
      } finally {
        if (!cancelled) loading = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  async function addWithStatus(status: Status) {
    const hit = hitFromDetail();
    if (!hit) return;
    adding = true;
    err = null;
    try {
      const db = await getDatabase();
      const r = await addOpenLibrarySearchHitToLibrary(db, hit, status);
      if (r.alreadyInLibrary) {
        searchSession.msg = t("search.already");
      } else {
        searchSession.msg = t("search.added");
        await goto(resolve("/library/[id]", { id: String(r.libraryId) }));
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      adding = false;
    }
  }
</script>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-8">
  <p>
    <a class="text-sm text-emerald-700 hover:underline dark:text-emerald-400" href={resolve("/search")}
      >{t("search.back_search")}</a
    >
  </p>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if err && !detail}
    <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
  {:else if detail}
    <header class="flex gap-4">
      {#if posterUrl}
        <img src={posterUrl} alt="" class="h-40 w-28 shrink-0 rounded object-cover" />
      {:else}
        <div class="h-40 w-28 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
      {/if}
      <div class="min-w-0 flex-1 space-y-2">
        <h1 class="text-xl font-semibold">{detail.title}</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          {detail.authors.join(", ")} · {detail.year}
        </p>
        {#if detail.isbn}
          <p class="text-xs text-zinc-500">{t("detail.book_isbn")}: {detail.isbn}</p>
        {/if}
        {#if detail.languages.length > 0}
          <p class="text-xs text-zinc-500">
            {t("detail.book_languages")}: {detail.languages.join(", ")}
          </p>
        {/if}
        <button
          type="button"
          class="inline-block text-xs text-emerald-700 hover:underline dark:text-emerald-400"
          onclick={() => detail && window.open(detail.openLibraryUrl, "_blank", "noopener,noreferrer")}
        >
          {t("detail.book_open_library")}
        </button>
        <AddToLibraryMenuButton menuId={detailMenuId} busy={adding} onAdd={(st) => addWithStatus(st)} />
      </div>
    </header>

    {#if detail.overview}
      <section class="space-y-2">
        <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("search.overview")}</h2>
        <p class="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{detail.overview}</p>
      </section>
    {/if}

    {#if err}
      <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
    {/if}

    <OpenLibraryRelatedSuggestionsBlock editionId={detail.editionId} />
  {/if}
</div>
