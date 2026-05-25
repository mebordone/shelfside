<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { listLibraryWithCatalog, type LibraryListRow } from "$lib/db";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import { t } from "$lib/i18n";
  import { labelForMedia, labelForStatus } from "$lib/i18n/labels";
  import { buildMediaFilterChipOptions } from "$lib/library/searchSourceOptions";
  import { clearHomeRefreshPending, homeRefreshPending } from "$lib/library/mutations";
  import { mapLibraryRowsWithPosters, type WithDisplayUrl } from "$lib/poster";
  import {
    persistHomeMediaFilter,
    readHomeMediaFilter,
    type HomeMediaFilter,
  } from "$lib/stores/homeMediaFilter";

  const HOME_MAX_PER_SECTION = 24;

  type Row = WithDisplayUrl<LibraryListRow>;

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let mediaFilter = $state<HomeMediaFilter>(readHomeMediaFilter());

  const HOME_SECTION_ORDER = ["in_progress", "paused", "planning"] as const;

  const filteredRows = $derived(
    mediaFilter ? rows.filter((r) => r.media_type === mediaFilter) : rows,
  );

  const grouped = $derived.by(() => {
    const o: Record<string, Row[]> = {};
    for (const st of HOME_SECTION_ORDER) o[st] = [];
    for (const r of filteredRows) {
      const bucket = o[r.status];
      if (bucket) bucket.push(r);
    }
    return o;
  });

  const groupedLimited = $derived.by(() => {
    const o: Record<string, Row[]> = {};
    let totalShown = 0;
    for (const st of HOME_SECTION_ORDER) {
      const full = grouped[st] ?? [];
      o[st] = full.slice(0, HOME_MAX_PER_SECTION);
      totalShown += o[st].length;
    }
    return { sections: o, totalShown };
  });

  const showMoreLink = $derived(filteredRows.length > groupedLimited.totalShown);

  const mediaChipOptions = $derived(buildMediaFilterChipOptions(t, labelForMedia));

  const homePath = resolve("/");

  function onHomeMediaFilterChange(value: string) {
    mediaFilter = value as HomeMediaFilter;
    persistHomeMediaFilter(mediaFilter);
    void loadLibrary();
  }

  function tvProgressLine(r: Row): string | null {
    if (r.media_type !== "tv") return null;
    if (r.current_season == null && r.last_episode_watched == null) return null;
    const s = r.current_season ?? "—";
    const e = r.last_episode_watched ?? "—";
    return `T${s} · E${e}`;
  }

  async function loadLibrary() {
    loading = true;
    try {
      const db = await getDatabase();
      const base = await listLibraryWithCatalog(db, mediaFilter ? { mediaType: mediaFilter } : {});
      rows = await mapLibraryRowsWithPosters(base);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadLibrary();
  });

  afterNavigate(({ to, from }) => {
    if (to?.url.pathname !== homePath) return;
    if (from?.url.pathname === homePath && !homeRefreshPending()) return;
    clearHomeRefreshPending();
    void loadLibrary();
  });
</script>

<main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else}
    <FilterChipBar
      options={mediaChipOptions}
      value={mediaFilter}
      includeAll
      allLabel={t("media.all")}
      ariaLabel={t("home.media_filter")}
      onchange={onHomeMediaFilterChange}
    />
    {#if groupedLimited.totalShown === 0}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("home.empty_focus")}</p>
    <p class="pt-4">
      <a
        class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        href={resolve("/search")}>{t("nav.search")}</a
      >
      <span class="text-zinc-400"> · </span>
      <a
        class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        href={resolve("/add/manual")}>{t("nav.manual")}</a
      >
    </p>
    {:else}
    {#each HOME_SECTION_ORDER as st (st)}
      {@const list = groupedLimited.sections[st] ?? []}
      {#if list.length > 0}
        <section class="space-y-3">
          <div class="flex items-baseline justify-between gap-2 border-b border-zinc-200 pb-1 dark:border-zinc-800">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {labelForStatus(st)}
            </h2>
            <span class="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{list.length}</span>
          </div>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]"
          >
            {#each list as r (r.id)}
              <a
                class="group flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition hover:border-emerald-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500"
                href={resolve("/library/[id]", { id: String(r.id) })}
              >
                {#if r.displayUrl}
                  <img
                    src={r.displayUrl}
                    alt=""
                    class="aspect-[2/3] w-full rounded object-cover"
                  />
                {:else}
                  <div class="aspect-[2/3] w-full rounded bg-zinc-200 dark:bg-zinc-800"></div>
                {/if}
                <p class="line-clamp-2 text-center text-[11px] font-medium leading-tight text-emerald-800 group-hover:underline dark:text-emerald-300">
                  {r.title}
                </p>
                {#if tvProgressLine(r)}
                  <p class="text-center text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {tvProgressLine(r)}
                  </p>
                {:else}
                  <p class="text-center text-[10px] text-zinc-500 dark:text-zinc-400">{labelForMedia(r.media_type)}</p>
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
    {#if showMoreLink}
      <p class="text-sm text-zinc-500">
        {t("home.more_in_library")}
        <a class="ml-1 text-emerald-700 hover:underline dark:text-emerald-400" href={resolve("/library")}
          >{t("home.open_full_library")}</a
        >
      </p>
    {/if}
    {/if}
  {/if}

  <p class="pt-2">
    <a
      class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      href={resolve("/library")}>{t("home.open_full_library")}</a
    >
  </p>
</main>
