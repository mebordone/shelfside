<script lang="ts">
  import { onMount } from "svelte";
  import { getDatabase } from "$lib/db/connection";
  import { t } from "$lib/i18n/es";
  import { setTheme, theme } from "$lib/stores/theme.svelte";

  let schemaValue = $state<string | null>(null);

  onMount(() => {
    void (async () => {
      const db = await getDatabase();
      const rows = await db.select<{ value: string }[]>(
        "SELECT value FROM app_meta WHERE key = $1",
        ["schema_check"],
      );
      schemaValue = rows[0]?.value ?? null;
    })();
  });
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">{t("app.title")}</h1>
    <p class="text-zinc-600 dark:text-zinc-400">{t("app.subtitle")}</p>
  </header>

  <section class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t("home.db_ready")}</p>
    {#if schemaValue}
      <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {t("home.schema_row")}: <code class="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">{schemaValue}</code>
      </p>
    {/if}
  </section>

  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm text-zinc-500 dark:text-zinc-400">{t("theme.toggle")}</span>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-md border px-3 py-1.5 text-sm transition-colors {theme.mode === 'light'
          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
          : 'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'}"
        onclick={() => setTheme("light")}
      >
        {t("theme.light")}
      </button>
      <button
        type="button"
        class="rounded-md border px-3 py-1.5 text-sm transition-colors {theme.mode === 'dark'
          ? 'border-emerald-600 bg-emerald-950 text-emerald-100'
          : 'border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'}"
        onclick={() => setTheme("dark")}
      >
        {t("theme.dark")}
      </button>
    </div>
  </div>
</main>
