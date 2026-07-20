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
  import { persistLastSync } from "$lib/stores/lastSync";
  import { backfillMissingPosters } from "$lib/poster";
  import { formatSyncSummary } from "$lib/sync/formatSyncSummary";
  import { syncSyncFolder } from "$lib/sync/syncSyncFolder";
  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);
  let moreOpen = $state(false);

  const pathname = $derived(page.url.pathname);
  const showMobileHeader = $derived(mobileLayout.current);

  // La sync de arranque corre en silencio: el resultado se persiste y se ve en Configuración.
  async function runBootSyncIfNeeded() {
    const syncDir = readSyncFolder();
    if (!readSyncOnStart() || !syncDir) return;

    logInfo("sync.boot.start", { syncDir });
    try {
      const db = await getDatabase();
      const { merge, exported, wrote } = await syncSyncFolder(db, syncDir);
      logInfo("sync.boot.ok", { ...merge, exported, wrote, syncDir });
      afterLibraryChanged();
      const summary = formatSyncSummary(merge, exported, wrote);
      const kind = merge.errors.length ? "err" : "ok";
      persistLastSync({ at: Date.now(), kind, summary });
      // Persiste pósters faltantes (p. ej. ítems llegados por sync) en segundo plano.
      void backfillMissingPosters(db)
        .then((r) => {
          if (r.downloaded > 0) afterLibraryChanged();
        })
        .catch(() => {});
    } catch (e) {
      logError("sync.boot.error", e);
      const errText = e instanceof Error ? e.message : String(e);
      persistLastSync({ at: Date.now(), kind: "err", summary: errText });
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
