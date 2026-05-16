<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { listLibraryWithCatalog, type LibraryListRow } from "$lib/db";
  import { t } from "$lib/i18n/es";
  import { resolvePosterDisplayUrl } from "$lib/poster";
  import { setTheme, theme } from "$lib/stores/theme.svelte";

  type Row = LibraryListRow & { displayUrl: string | null };

  let rows = $state<Row[]>([]);
  let loading = $state(true);
  let schemaValue = $state<string | null>(null);

  /** En progreso, pausa y cola en el inicio; orden fijo UX. */
  const HOME_SECTION_ORDER = ["in_progress", "paused", "planning"] as const;

  const grouped = $derived.by(() => {
    const o: Record<string, Row[]> = {};
    for (const st of HOME_SECTION_ORDER) o[st] = [];
    for (const r of rows) {
      const bucket = o[r.status];
      if (bucket) bucket.push(r);
    }
    return o;
  });

  const homeEntriesTotal = $derived(
    HOME_SECTION_ORDER.reduce((n, st) => n + (grouped[st]?.length ?? 0), 0),
  );

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
      const base = await listLibraryWithCatalog(db, {});
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

  onMount(() => {
    void loadLibrary();
    void (async () => {
      const db = await getDatabase();
      const meta = await db.select<{ value: string }[]>(
        "SELECT value FROM app_meta WHERE key = $1",
        ["schema_check"],
      );
      schemaValue = meta[0]?.value ?? null;
    })();
  });
</script>

<main class="mx-auto max-w-5xl space-y-6 px-4 py-6">
  {#if loading}
    <p class="text-sm text-zinc-500">{t("common.loading")}</p>
  {:else if homeEntriesTotal === 0}
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
      {@const list = grouped[st] ?? []}
      {#if list.length > 0}
        <section class="space-y-3">
          <div class="flex items-baseline justify-between gap-2 border-b border-zinc-200 pb-1 dark:border-zinc-800">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {statusLabel(st)}
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
                  <p class="text-center text-[10px] text-zinc-500 dark:text-zinc-400">{mediaLabel(r.media_type)}</p>
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  {/if}

  <p class="pt-2">
    <a
      class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      href={resolve("/library")}>{t("home.open_full_library")}</a
    >
  </p>

  <footer class="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/80">
      <p class="font-medium text-emerald-800 dark:text-emerald-300">{t("home.db_ready")}</p>
      {#if schemaValue}
        <p class="mt-1 text-zinc-600 dark:text-zinc-400">
          {t("home.schema_row")}: <code class="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">{schemaValue}</code>
        </p>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-xs text-zinc-500 dark:text-zinc-400">{t("theme.toggle")}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border px-2.5 py-1 text-xs transition-colors {theme.mode === 'light'
            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
            : 'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'}"
          onclick={() => setTheme("light")}
        >
          {t("theme.light")}
        </button>
        <button
          type="button"
          class="rounded-md border px-2.5 py-1 text-xs transition-colors {theme.mode === 'dark'
            ? 'border-emerald-600 bg-emerald-950 text-emerald-100'
            : 'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'}"
          onclick={() => setTheme("dark")}
        >
          {t("theme.dark")}
        </button>
      </div>
    </div>
  </footer>
</main>
