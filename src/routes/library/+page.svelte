<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { listLibraryWithCatalog, type LibraryListRow } from "$lib/db";
  import { t } from "$lib/i18n/es";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { STATUSES } from "$lib/db/types";

  type Row = LibraryListRow & { displayUrl: string | null };

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let mediaFilter = $state("");
  let statusFilter = $state("");
  let search = $state("");

  async function load() {
    loading = true;
    try {
      const db = await getDatabase();
      const f: { mediaType?: string; status?: string; search?: string } = {};
      if (mediaFilter) f.mediaType = mediaFilter;
      if (statusFilter) f.status = statusFilter;
      if (search.trim()) f.search = search.trim();
      const base = await listLibraryWithCatalog(db, f);
      rows = await Promise.all(
        base.map(async (r) => ({
          ...r,
          displayUrl: await resolvePosterDisplayUrl(r.poster_local_path, r.image_url),
        })),
      );
    } finally {
      loading = false;
    }
  }

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

  onMount(() => void load());
</script>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("library.title")}</h1>

  <section class="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("library.filters")}</p>
    <div class="flex flex-wrap gap-3">
      <label class="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        {t("library.media_filter")}
        <select
          class="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={mediaFilter}
        >
          <option value="">{t("media.all")}</option>
          <option value="movie">{t("media.movie")}</option>
          <option value="tv">{t("media.tv")}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        {t("library.status_filter")}
        <select
          class="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={statusFilter}
        >
          <option value="">{t("filter.all")}</option>
          {#each STATUSES as st (st)}
            <option value={st}>{statusLabel(st)}</option>
          {/each}
        </select>
      </label>
      <label class="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        {t("library.search_placeholder")}
        <input
          class="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          bind:value={search}
        />
      </label>
      <div class="flex items-end">
        <button
          type="button"
          class="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          onclick={() => void load()}
        >
          {t("common.apply")}
        </button>
      </div>
    </div>
  </section>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if rows.length === 0}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("library.empty")}</p>
  {:else}
    <ul class="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each rows as r (r.id)}
        <li class="flex gap-3 bg-white p-3 dark:bg-zinc-900">
          {#if r.displayUrl}
            <img src={r.displayUrl} alt="" class="h-16 w-11 shrink-0 rounded object-cover" />
          {:else}
            <div class="h-16 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          {/if}
          <div class="min-w-0 flex-1">
            <a class="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href={resolve("/library/[id]", { id: String(r.id) })}
              >{r.title}</a
            >
            <p class="text-xs text-zinc-500">
              {mediaLabel(r.media_type)} · {statusLabel(r.status)}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
