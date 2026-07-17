<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { t } from "$lib/i18n";
  import { brandClassMobile, navActive } from "$lib/nav/navActive";

  const pathname = $derived(page.url.pathname);
</script>

<header
  class="flex w-full items-center border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] dark:border-zinc-800 dark:bg-zinc-950"
  data-testid="mobile-header"
>
  <a
    class={brandClassMobile(navActive(pathname, "home"))}
    href={resolve("/")}
    aria-current={navActive(pathname, "home") ? "page" : undefined}
    >{t("app.title")}</a
  >
</header>
