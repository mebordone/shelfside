<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { runMigrations } from "$lib/db";
  import { initTheme } from "$lib/stores/theme.svelte";
  import { appLocale, initAppLocale, t } from "$lib/i18n";
  import { initRuntimeLogs, logError, logInfo } from "$lib/logs/runtimeLogs";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);

  const pathname = $derived(page.url.pathname);

  function navActive(
    which: "home" | "library" | "search" | "manual" | "settings" | "stats",
  ): boolean {
    const p = pathname;
    if (which === "home") return p === "/";
    if (which === "library") return p.startsWith("/library");
    if (which === "search") return p.startsWith("/search");
    if (which === "manual") return p.startsWith("/add/manual");
    if (which === "settings") return p.startsWith("/settings");
    if (which === "stats") return p.startsWith("/stats");
    return false;
  }

  function navClass(active: boolean): string {
    const base = "rounded px-2 py-1.5 text-sm font-medium transition-colors";
    return active
      ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white`
      : `${base} text-zinc-700 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800`;
  }

  /** Marca / inicio: misma fila que el menú, sin duplicar enlace “Inicio”. */
  function brandClass(active: boolean): string {
    const base = "shrink-0 rounded px-2 py-1 text-base font-semibold tracking-tight transition-colors";
    return active
      ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white`
      : `${base} text-emerald-900 hover:bg-zinc-200 dark:text-emerald-300 dark:hover:bg-zinc-800`;
  }

  function settingsIconClass(active: boolean): string {
    const base =
      "ml-auto inline-flex shrink-0 items-center justify-center rounded-md p-2 transition-colors";
    return active
      ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600`
      : `${base} text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800`;
  }

  onMount(() => {
    initRuntimeLogs();
    initAppLocale();
    initTheme();
    void (async () => {
      try {
        logInfo("db.migrations.start");
        await runMigrations();
        logInfo("db.migrations.ok");
        ready = true;
      } catch (e) {
        logError("db.migrations.error", e);
        bootError = e instanceof Error ? e.message : String(e);
      }
    })();
  });
</script>

{#if bootError}
  <div class="flex min-h-screen items-center justify-center p-6">
    <p class="max-w-md text-center text-red-600 dark:text-red-400">{bootError}</p>
  </div>
{:else if !ready}
  <div class="flex min-h-screen items-center justify-center p-6">
    <p class="text-zinc-500 dark:text-zinc-400">{t("home.loading")}</p>
  </div>
{:else}
  {#key appLocale.current}
  <div class="flex min-h-screen flex-col">
    <nav
      class="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label={t("nav.aria")}
    >
      <a
        class={brandClass(navActive("home"))}
        href={resolve("/")}
        aria-current={navActive("home") ? "page" : undefined}
        >{t("app.title")}</a
      >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <a class={navClass(navActive("library"))} href={resolve("/library")}>{t("nav.library")}</a>
        <a class={navClass(navActive("search"))} href={resolve("/search")}>{t("nav.search")}</a>
        <a class={navClass(navActive("manual"))} href={resolve("/add/manual")}>{t("nav.manual")}</a>
        <a class={navClass(navActive("stats"))} href={resolve("/stats")}>{t("nav.stats")}</a>
      </div>
      <a
        class={settingsIconClass(navActive("settings"))}
        href={resolve("/settings")}
        aria-label={t("nav.settings_aria")}
        aria-current={navActive("settings") ? "page" : undefined}
        title={t("nav.settings")}
      >
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
          />
        </svg>
      </a>
    </nav>
    <div class="flex-1">
      {@render children()}
    </div>
  </div>
  {/key}
{/if}
