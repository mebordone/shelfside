<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import BottomNav from "$lib/components/nav/BottomNav.svelte";
  import MobileHeader from "$lib/components/nav/MobileHeader.svelte";
  import MoreSheet from "$lib/components/nav/MoreSheet.svelte";
  import TopNav from "$lib/components/nav/TopNav.svelte";
  import { runMigrations } from "$lib/db";
  import { getDatabase } from "$lib/db/connection";
  import { afterLibraryChanged } from "$lib/library/mutations";
  import { appLocale, initAppLocale, t } from "$lib/i18n";
  import { initRuntimeLogs, logError, logInfo } from "$lib/logs/runtimeLogs";
  import { destroyMobileLayout, initMobileLayout, mobileLayout } from "$lib/stores/mobileLayout.svelte";
  import { initTheme } from "$lib/stores/theme.svelte";
  import { readSyncFolder } from "$lib/stores/syncFolder";
  import { readSyncOnStart } from "$lib/stores/syncOnStart";
  import { formatSyncSummary } from "$lib/sync/formatSyncSummary";
  import { syncSyncFolder } from "$lib/sync/syncSyncFolder";
  import { navActive } from "$lib/nav/navActive";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);
  let bootSyncBanner = $state<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  let moreOpen = $state(false);

  const pathname = $derived(page.url.pathname);
  const showMobileHeader = $derived(mobileLayout.current && !navActive(pathname, "home"));

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
    const stopMobile = initMobileLayout();
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
    return () => {
      stopMobile();
      destroyMobileLayout();
    };
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
  <div
    class="flex min-h-screen flex-col {mobileLayout.current
      ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]'
      : ''}"
  >
    {#if mobileLayout.current}
      {#if showMobileHeader}
        <MobileHeader />
      {/if}
    {:else}
      <TopNav />
    {/if}
    {#if bootSyncBanner}
      <div
        class="flex items-start gap-2 border-b px-3 py-2 text-sm {mobileLayout.current &&
        !showMobileHeader
          ? 'pt-[max(0.5rem,env(safe-area-inset-top,0px))]'
          : ''} {bootSyncBanner.kind === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
          : bootSyncBanner.kind === 'err'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
            : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'}"
        role="status"
      >
        <p class="min-w-0 flex-1 break-words">{bootSyncBanner.text}</p>
        <button
          type="button"
          class="shelf-touch inline-flex shrink-0 items-center justify-center self-start rounded-md px-2 text-xs font-medium opacity-80 hover:opacity-100"
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
    {#if mobileLayout.current}
      <BottomNav
        moreOpen={moreOpen}
        onOpenMore={() => {
          moreOpen = !moreOpen;
        }}
      />
      <MoreSheet open={moreOpen} onClose={() => (moreOpen = false)} />
    {/if}
  </div>
  {/key}
{/if}
