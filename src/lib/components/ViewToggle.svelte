<script lang="ts">
  interface Props {
    value: "carousel" | "grid" | "list";
    /** Primera opción (izquierda). */
    first: "carousel" | "grid" | "list";
    /** Segunda opción (derecha). */
    second: "carousel" | "grid" | "list";
    firstLabel: string;
    secondLabel: string;
    ariaLabel: string;
    onchange: (value: "carousel" | "grid" | "list") => void;
  }

  let { value, first, second, firstLabel, secondLabel, ariaLabel, onchange }: Props = $props();

  function btnClass(active: boolean): string {
    const base =
      "inline-flex min-h-9 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors";
    return active
      ? `${base} bg-white text-emerald-700 shadow-sm dark:bg-zinc-700 dark:text-emerald-300`
      : `${base} text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100`;
  }

  function iconFor(kind: "carousel" | "grid" | "list") {
    return kind;
  }
</script>

<div
  class="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
  role="group"
  aria-label={ariaLabel}
>
  <button
    type="button"
    class={btnClass(value === first)}
    aria-pressed={value === first}
    title={firstLabel}
    aria-label={firstLabel}
    onclick={() => onchange(first)}
  >
    {#if iconFor(first) === "carousel"}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="7" y="5" width="10" height="14" rx="1.5" />
        <path d="M4 8v8M20 8v8" stroke-linecap="round" />
      </svg>
    {:else if iconFor(first) === "grid"}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </svg>
    {:else}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
      </svg>
    {/if}
  </button>
  <button
    type="button"
    class={btnClass(value === second)}
    aria-pressed={value === second}
    title={secondLabel}
    aria-label={secondLabel}
    onclick={() => onchange(second)}
  >
    {#if iconFor(second) === "carousel"}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="7" y="5" width="10" height="14" rx="1.5" />
        <path d="M4 8v8M20 8v8" stroke-linecap="round" />
      </svg>
    {:else if iconFor(second) === "grid"}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </svg>
    {:else}
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
      </svg>
    {/if}
  </button>
</div>
