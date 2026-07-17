<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { t } from "$lib/i18n";
  import { bottomTabClass, navActive } from "$lib/nav/navActive";

  interface Props {
    moreOpen: boolean;
    onOpenMore: () => void;
  }

  let { moreOpen, onOpenMore }: Props = $props();

  const pathname = $derived(page.url.pathname);
  const moreActive = $derived(moreOpen || navActive(pathname, "more"));
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-zinc-50 pb-[env(safe-area-inset-bottom,0px)] dark:border-zinc-800 dark:bg-zinc-950"
  aria-label={t("nav.bottom_aria")}
  data-testid="bottom-nav"
>
  <div class="flex h-14 items-stretch">
    <a
      class={bottomTabClass(navActive(pathname, "home") && !moreOpen)}
      href={resolve("/")}
      aria-current={navActive(pathname, "home") && !moreOpen ? "page" : undefined}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
      <span>{t("nav.home")}</span>
    </a>
    <a
      class={bottomTabClass(navActive(pathname, "library") && !moreOpen)}
      href={resolve("/library")}
      aria-current={navActive(pathname, "library") && !moreOpen ? "page" : undefined}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
      <span>{t("nav.library")}</span>
    </a>
    <a
      class={bottomTabClass(navActive(pathname, "search") && !moreOpen)}
      href={resolve("/search")}
      aria-current={navActive(pathname, "search") && !moreOpen ? "page" : undefined}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path stroke-linecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <span>{t("nav.search")}</span>
    </a>
    <button
      type="button"
      class={bottomTabClass(moreActive)}
      aria-label={t("nav.more_aria")}
      aria-expanded={moreOpen}
      aria-controls="more-sheet"
      data-testid="nav-more-tab"
      onclick={onOpenMore}
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      <span>{t("nav.more")}</span>
    </button>
  </div>
</nav>
