<script lang="ts">
  import { STATUSES, type Status } from "$lib/db/types";
  import { t } from "$lib/i18n/es";
  import { persistDefaultAddStatus } from "$lib/stores/defaultAddStatus";

  interface Props {
    onAdd: (status: Status) => void | Promise<void>;
    /** Debe ser único en la página (ej. hit-movie-99 o rel-ol-12). */
    menuId: string;
    busy?: boolean;
    disabled?: boolean;
    /** `row`: lista / detalle; `compact`: carrusel (solo +). */
    variant?: "row" | "compact";
  }

  let { onAdd, menuId, busy = false, disabled = false, variant = "row" }: Props = $props();

  let menuOpen = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);
  let menuBoxStyle = $state("");

  const MENU_WIDTH = 168;

  function updateMenuPosition() {
    if (!menuOpen || !triggerRef) return;
    const r = triggerRef.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 6;
    let left = Math.round(Math.min(Math.max(margin, r.left), vw - MENU_WIDTH - margin));
    const spaceBelow = vh - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const preferBelow = spaceBelow >= 100 || spaceBelow >= spaceAbove;
    let top: number;
    let maxH: number;
    if (preferBelow) {
      top = Math.round(r.bottom + margin);
      maxH = Math.min(280, Math.max(80, vh - top - margin));
    } else {
      maxH = Math.min(280, Math.max(80, spaceAbove - margin));
      top = Math.round(Math.max(margin, r.top - margin - maxH));
    }
    menuBoxStyle = `top:${top}px;left:${left}px;width:${MENU_WIDTH}px;max-height:${maxH}px`;
  }

  const MENU_EVENT = "shelf-add-menu-open";

  function openOrToggleMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || busy) return;
    if (menuOpen) {
      menuOpen = false;
      menuBoxStyle = "";
      return;
    }
    window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: menuId }));
    menuOpen = true;
    updateMenuPosition();
  }

  $effect(() => {
    const onOtherOpen = (ev: Event) => {
      const ce = ev as CustomEvent<string>;
      if (ce.detail !== menuId) {
        menuOpen = false;
        menuBoxStyle = "";
      }
    };
    window.addEventListener(MENU_EVENT, onOtherOpen);
    return () => window.removeEventListener(MENU_EVENT, onOtherOpen);
  });

  async function pickStatus(st: Status, e: MouseEvent) {
    e.stopPropagation();
    if (disabled || busy) return;
    persistDefaultAddStatus(st);
    menuOpen = false;
    menuBoxStyle = "";
    await onAdd(st);
  }

  $effect(() => {
    if (!menuOpen) return;
    const raf = requestAnimationFrame(() => updateMenuPosition());
    const onMove = () => updateMenuPosition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  });

  $effect(() => {
    if (!menuOpen) return;
    let detach: (() => void) | undefined;
    const tid = window.setTimeout(() => {
      const onDoc = (ev: MouseEvent) => {
        const n = ev.target;
        if (!(n instanceof Node)) return;
        if (triggerRef?.contains(n)) return;
        if (document.getElementById(`${menuId}-list`)?.contains(n)) return;
        menuOpen = false;
        menuBoxStyle = "";
      };
      document.addEventListener("click", onDoc, true);
      detach = () => document.removeEventListener("click", onDoc, true);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      detach?.();
    };
  });
</script>

<div class="inline-flex max-w-full" data-add-menu={menuId}>
  <button
    bind:this={triggerRef}
    type="button"
    class="{variant === 'compact'
      ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold leading-none text-white shadow-md ring-1 ring-black/20 hover:bg-emerald-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300'
      : 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300'}"
    disabled={disabled || busy}
    aria-expanded={menuOpen}
    aria-haspopup="menu"
    aria-controls={`${menuId}-list`}
    title={t("add.choose_status_menu")}
    onclick={(e) => openOrToggleMenu(e)}
  >
    {#if busy}
      <span class="sr-only">{t("search.adding")}</span>
      <span class="h-3.5 w-3.5 animate-pulse rounded-full bg-white/90" aria-hidden="true"></span>
    {:else if variant === "compact"}
      <span aria-hidden="true">+</span>
    {:else}
      {t("search.add")}
    {/if}
  </button>
</div>

{#if menuOpen}
  <ul
    id={`${menuId}-list`}
    role="menu"
    class="fixed overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900 {variant === 'compact'
      ? 'text-[11px] leading-snug'
      : ''}"
    style={`position:fixed;z-index:10050;${menuBoxStyle}`}
  >
    {#each STATUSES as st (st)}
      <li role="presentation">
        <button
          type="button"
          role="menuitem"
          class="block w-full whitespace-nowrap px-3 py-2 text-left hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/80"
          disabled={disabled || busy}
          onclick={(e) => void pickStatus(st, e)}
        >
          {t(`status.${st}`)}
        </button>
      </li>
    {/each}
  </ul>
{/if}
