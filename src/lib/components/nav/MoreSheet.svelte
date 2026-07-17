<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import { navActive, navLinkClass } from "$lib/nav/navActive";

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  const pathname = $derived(page.url.pathname);

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  afterNavigate(() => {
    if (open) onClose();
  });
</script>

{#if open}
  <div class="fixed inset-0 z-50" data-testid="more-sheet" id="more-sheet">
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label={t("common.close")}
      onclick={onClose}
    ></button>
    <div
      class="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-zinc-200 bg-zinc-50 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label={t("nav.more")}
    >
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true"></div>
      <ul class="flex flex-col gap-1 px-3 pb-2">
        <li>
          <a
            class="{navLinkClass(navActive(pathname, 'manual'))} flex min-h-11 w-full items-center"
            href={resolve("/add/manual")}
            onclick={onClose}>{t("nav.manual")}</a
          >
        </li>
        <li>
          <a
            class="{navLinkClass(navActive(pathname, 'stats'))} flex min-h-11 w-full items-center"
            href={resolve("/stats")}
            onclick={onClose}>{t("nav.stats")}</a
          >
        </li>
        <li>
          <a
            class="{navLinkClass(navActive(pathname, 'settings'))} flex min-h-11 w-full items-center"
            href={resolve("/settings")}
            onclick={onClose}>{t("nav.settings")}</a
          >
        </li>
      </ul>
    </div>
  </div>
{/if}
