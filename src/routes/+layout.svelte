<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { runMigrations } from "$lib/db";
  import { initTheme } from "$lib/stores/theme.svelte";
  import { t } from "$lib/i18n/es";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);

  onMount(() => {
    initTheme();
    void (async () => {
      try {
        await runMigrations();
        ready = true;
      } catch (e) {
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
  {@render children()}
{/if}
