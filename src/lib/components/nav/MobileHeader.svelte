<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { t } from "$lib/i18n";
  import { brandClassMobile, navActive } from "$lib/nav/navActive";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
  import { homeView, setHomeView } from "$lib/stores/homeView.svelte";
  import { libraryView, setLibraryView } from "$lib/stores/libraryView.svelte";

  const pathname = $derived(page.url.pathname);
  const isHome = $derived(navActive(pathname, "home"));
  /** Solo lista de Biblioteca (no ficha/edición). */
  const isLibraryBrowse = $derived(pathname === "/library" || pathname === "/library/");
</script>

<header
  class="flex w-full items-center border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] dark:border-zinc-800 dark:bg-zinc-950"
  data-testid="mobile-header"
>
  <a
    class={brandClassMobile()}
    href={resolve("/")}
    aria-current={isHome ? "page" : undefined}
    >{t("app.title")}</a
  >
  {#if isHome}
    <div class="ml-auto">
      <ViewToggle
        value={homeView.current}
        first="carousel"
        second="grid"
        firstLabel={t("home.view_carousel")}
        secondLabel={t("home.view_grid")}
        ariaLabel={t("home.view_toggle")}
        onchange={(v) => setHomeView(v as "carousel" | "grid")}
      />
    </div>
  {:else if isLibraryBrowse}
    <div class="ml-auto">
      <ViewToggle
        value={libraryView.current}
        first="grid"
        second="list"
        firstLabel={t("library.view_grid")}
        secondLabel={t("library.view_list")}
        ariaLabel={t("library.view_toggle")}
        onchange={(v) => setLibraryView(v as "grid" | "list")}
      />
    </div>
  {/if}
</header>
