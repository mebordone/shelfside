<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { t } from "$lib/i18n";
  import {
    brandClass,
    navActive,
    navLinkClass,
    settingsIconClass,
  } from "$lib/nav/navActive";

  const pathname = $derived(page.url.pathname);
</script>

<nav
  class="flex w-full flex-wrap items-start gap-x-3 gap-y-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] dark:border-zinc-800 dark:bg-zinc-950"
  aria-label={t("nav.aria")}
  data-testid="top-nav"
>
  <a
    class={brandClass(navActive(pathname, "home"))}
    href={resolve("/")}
    aria-current={navActive(pathname, "home") ? "page" : undefined}
    >{t("app.title")}</a
  >
  <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
    <a class={navLinkClass(navActive(pathname, "library"))} href={resolve("/library")}
      >{t("nav.library")}</a
    >
    <a class={navLinkClass(navActive(pathname, "search"))} href={resolve("/search")}
      >{t("nav.search")}</a
    >
    <a class={navLinkClass(navActive(pathname, "manual"))} href={resolve("/add/manual")}
      >{t("nav.manual")}</a
    >
    <a class={navLinkClass(navActive(pathname, "stats"))} href={resolve("/stats")}
      >{t("nav.stats")}</a
    >
  </div>
  <a
    class={settingsIconClass(navActive(pathname, "settings"))}
    href={resolve("/settings")}
    aria-label={t("nav.settings_aria")}
    aria-current={navActive(pathname, "settings") ? "page" : undefined}
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
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  </a>
</nav>
