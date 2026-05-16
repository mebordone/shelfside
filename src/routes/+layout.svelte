<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { runMigrations } from "$lib/db";
  import { initTheme } from "$lib/stores/theme.svelte";
  import { t } from "$lib/i18n/es";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  let ready = $state(false);
  let bootError = $state<string | null>(null);

  const pathname = $derived(page.url.pathname);

  function navActive(which: "home" | "library" | "search" | "manual"): boolean {
    const p = pathname;
    if (which === "home") return p === "/";
    if (which === "library") return p.startsWith("/library");
    if (which === "search") return p.startsWith("/search");
    if (which === "manual") return p.startsWith("/add/manual");
    return false;
  }

  function navClass(active: boolean): string {
    const base = "rounded px-2 py-1.5 text-sm font-medium transition-colors";
    return active
      ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white`
      : `${base} text-zinc-700 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800`;
  }

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
  <div class="flex min-h-screen flex-col">
    <nav
      class="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label={t("nav.aria")}
    >
      <a class={navClass(navActive("home"))} href={resolve("/")}>{t("nav.home")}</a>
      <a class={navClass(navActive("library"))} href={resolve("/library")}>{t("nav.library")}</a>
      <a class={navClass(navActive("search"))} href={resolve("/search")}>{t("nav.search")}</a>
      <a class={navClass(navActive("manual"))} href={resolve("/add/manual")}>{t("nav.manual")}</a>
    </nav>
    <div class="flex-1">
      {@render children()}
    </div>
  </div>
{/if}
