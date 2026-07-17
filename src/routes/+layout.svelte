<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { runMigrations } from "$lib/db";
  import { getDatabase } from "$lib/db/connection";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { initTheme } from "$lib/stores/theme.svelte";
  import { readSyncFolder } from "$lib/stores/syncFolder";
  import { readSyncOnStart } from "$lib/stores/syncOnStart";
  import { formatSyncSummary } from "$lib/sync/formatSyncSummary";
  import { syncSyncFolder } from "$lib/sync/syncSyncFolder";
  import { appLocale, initAppLocale, t } from "$lib/i18n";
  import { initRuntimeLogs, logError, logInfo } from "$lib/logs/runtimeLogs";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);
  let bootSyncBanner = $state<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

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

  async function runBootSyncIfNeeded() {
    const syncDir = readSyncFolder();
    if (!readSyncOnStart() || !syncDir) return;

    bootSyncBanner = { kind: "info", text: t("sync.boot_running") };
    logInfo("sync.boot.start", { syncDir });
    try {
      const db = await getDatabase();
      const { merge, exported } = await syncSyncFolder(db, syncDir);
      logInfo("sync.boot.ok", { ...merge, exported, syncDir });
      afterLibraryChanged();
      bootSyncBanner = {
        kind: merge.errors.length ? "err" : "ok",
        text: formatSyncSummary(merge, exported),
      };
    } catch (e) {
      logError("sync.boot.error", e);
      bootSyncBanner = {
        kind: "err",
        text: e instanceof Error ? e.message : String(e),
      };
    }
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
        void runBootSyncIfNeeded();
      } catch (e) {
        logError("db.migrations.error", e);
        bootError = e instanceof Error ? e.message : String(e);
      }
    })();
  });
</script>

{#if bootError}
  <div class="flex min-h-screen items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
    <p class="max-w-md text-center text-red-600 dark:text-red-400">{bootError}</p>
  </div>
{:else if !ready}
  <div class="flex min-h-screen items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
    <p class="text-zinc-500 dark:text-zinc-400">{t("home.loading")}</p>
  </div>
{:else}
  {#key appLocale.current}
  <div class="flex min-h-screen flex-col pb-[env(safe-area-inset-bottom,0px)]">
    <nav
      class="flex w-full flex-wrap items-start gap-x-3 gap-y-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] dark:border-zinc-800 dark:bg-zinc-950"
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
    {#if bootSyncBanner}
      <div
        class="flex items-start gap-2 border-b px-3 py-2 text-sm {bootSyncBanner.kind === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
          : bootSyncBanner.kind === 'err'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
            : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'}"
        role="status"
      >
        <p class="min-w-0 flex-1 break-words">{bootSyncBanner.text}</p>
        <button
          type="button"
          class="shrink-0 rounded px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100"
          onclick={() => {
            bootSyncBanner = null;
          }}
        >
          {t("common.close")}
        </button>
      </div>
    {/if}
    <div class="flex-1">
      {@render children()}
    </div>
  </div>
  {/key}
{/if}
