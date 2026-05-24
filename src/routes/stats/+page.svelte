<script lang="ts">
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { countByMediaType, countByStatus, countLibraryEntries } from "$lib/db/stats";
  import { t } from "$lib/i18n";

  type Row = { label: string; n: number };

  let loading = $state(true);
  let total = $state(0);
  let byStatus = $state<Row[]>([]);
  let byMedia = $state<Row[]>([]);

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
        byStatus = statusRows.map((r) => ({ label: statusLabel(r.status), n: r.n }));
        byMedia = mediaRows.map((r) => ({ label: mediaLabel(r.media_type), n: r.n }));
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
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("stats.empty")}</p>
  {:else}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("stats.count").replace("{n}", String(total))}</p>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {t("stats.by_status")}
      </h2>
      <ul class="space-y-2">
        {#each byStatus as row (row.label)}
          <li class="space-y-1">
            <div class="flex justify-between text-xs">
              <span>{row.label}</span>
              <span class="tabular-nums text-zinc-500">{row.n}</span>
            </div>
            <div class="h-2 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                class="h-full rounded bg-emerald-600 dark:bg-emerald-500"
                style="width: {barWidth(row.n, maxStatus)}"
              ></div>
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {t("stats.by_media")}
      </h2>
      <ul class="space-y-2">
        {#each byMedia as row (row.label)}
          <li class="space-y-1">
            <div class="flex justify-between text-xs">
              <span>{row.label}</span>
              <span class="tabular-nums text-zinc-500">{row.n}</span>
            </div>
            <div class="h-2 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
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
