<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { countByMediaType, countByStatus, countLibraryEntries } from "$lib/db/stats";
  import { t } from "$lib/i18n";
  import { labelForMedia, labelForStatus } from "$lib/i18n/labels";

  type Row = { label: string; n: number };

  let loading = $state(true);
  let total = $state(0);
  let byStatus = $state<Row[]>([]);
  let byMedia = $state<Row[]>([]);

  function barWidth(n: number, max: number): string {
    if (max <= 0) return "0%";
    return `${Math.round((n / max) * 100)}%`;
  }

  onMount(() => {
    void (async () => {
      try {
        const db = await getDatabase();
        total = await countLibraryEntries(db);
        const statusRows = await countByStatus(db);
        const mediaRows = await countByMediaType(db);
        byStatus = statusRows.map((r) => ({ label: labelForStatus(r.status), n: r.n }));
        byMedia = mediaRows.map((r) => ({ label: labelForMedia(r.media_type), n: r.n }));
      } finally {
        loading = false;
      }
    })();
  });

  const maxStatus = $derived(Math.max(0, ...byStatus.map((r) => r.n)));
  const maxMedia = $derived(Math.max(0, ...byMedia.map((r) => r.n)));
</script>

<main class="mx-auto max-w-2xl space-y-8 px-4 py-6">
  <h1 class="text-xl font-semibold text-emerald-900 dark:text-emerald-200">{t("stats.title")}</h1>

  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if total === 0}
    <div class="space-y-3">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("stats.empty")}</p>
      <p class="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/library")}>{t("nav.library")}</a
        >
        <a
          class="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          href={resolve("/search")}>{t("nav.search")}</a
        >
      </p>
    </div>
  {:else}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("stats.count").replace("{n}", String(total))}</p>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {t("stats.by_status")}
      </h2>
      <ul class="space-y-3">
        {#each byStatus as row (row.label)}
          <li class="space-y-1.5">
            <div class="flex justify-between text-sm">
              <span>{row.label}</span>
              <span class="tabular-nums text-zinc-500">{row.n}</span>
            </div>
            <div class="h-3 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                class="h-full rounded bg-emerald-600 dark:bg-emerald-500"
                style="width: {barWidth(row.n, maxStatus)}"
              ></div>
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {t("stats.by_media")}
      </h2>
      <ul class="space-y-3">
        {#each byMedia as row (row.label)}
          <li class="space-y-1.5">
            <div class="flex justify-between text-sm">
              <span>{row.label}</span>
              <span class="tabular-nums text-zinc-500">{row.n}</span>
            </div>
            <div class="h-3 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                class="h-full rounded bg-emerald-600 dark:bg-emerald-500"
                style="width: {barWidth(row.n, maxMedia)}"
              ></div>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>
