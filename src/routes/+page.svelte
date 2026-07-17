<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { listLibraryWithCatalog, type LibraryListRow } from "$lib/db";
  import FilterChipBar from "$lib/components/FilterChipBar.svelte";
  import HomePosterCard from "$lib/components/library/HomePosterCard.svelte";
  import LibraryQuickEditSheet from "$lib/components/library/LibraryQuickEditSheet.svelte";
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
  let quickEditRow = $state<Row | null>(null);

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
  const allSectionsEmpty = $derived(groupedLimited.totalShown === 0);

  const mediaChipOptions = $derived(buildMediaFilterChipOptions(t, labelForMedia));

  const homePath = resolve("/");

  function onHomeMediaFilterChange(value: string) {
    mediaFilter = value as HomeMediaFilter;
    persistHomeMediaFilter(mediaFilter);
    void loadLibrary();
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

<main class="mx-auto max-w-5xl space-y-8 px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
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

    {#if allSectionsEmpty}
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("home.empty_focus")}</p>
      <p class="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-sm">
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/search")}>{t("nav.search")}</a
        >
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/add/manual")}>{t("nav.manual")}</a
        >
      </p>
    {:else}
      {#each HOME_SECTION_ORDER as st (st)}
        {@const list = groupedLimited.sections[st] ?? []}
        <section class="space-y-3">
          <div class="flex items-baseline justify-between gap-2 border-b border-zinc-200 pb-1 dark:border-zinc-800">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {labelForStatus(st)}
            </h2>
            <span class="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{list.length}</span>
          </div>
          {#if list.length === 0}
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{t("home.empty_section")}</p>
          {:else}
            <div
              class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
            >
              {#each list as r (r.id)}
                <HomePosterCard
                  row={r}
                  onLongPress={(row) => (quickEditRow = row)}
                  onQuickEdit={(row) => (quickEditRow = row)}
                />
              {/each}
            </div>
          {/if}
        </section>
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

<LibraryQuickEditSheet
  open={quickEditRow != null}
  row={quickEditRow}
  onClose={() => (quickEditRow = null)}
  onSaved={() => void loadLibrary()}
/>
