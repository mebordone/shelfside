<script lang="ts">
  export type FilterChipOption = {
    value: string;
    label: string;
    title?: string;
  };

  type Props = {
    options: FilterChipOption[];
    value: string;
    onchange: (value: string) => void;
    includeAll?: boolean;
    allLabel?: string;
    ariaLabel: string;
  };

  let {
    options,
    value,
    onchange,
    includeAll = false,
    allLabel = "",
    ariaLabel,
  }: Props = $props();

  function chipClass(active: boolean): string {
    const base =
      "inline-flex min-h-11 shrink-0 items-center rounded-full px-2.5 text-sm font-medium transition-colors";
    return active
      ? `${base} bg-emerald-600 text-white shadow-sm`
      : `${base} border border-zinc-300 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800`;
  }

  function select(next: string) {
    if (next !== value) onchange(next);
  }
</script>

<div
  class="flex gap-2 overflow-x-auto px-0.5 py-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]"
  role="radiogroup"
  aria-label={ariaLabel}
>
  {#if includeAll}
    <button
      type="button"
      role="radio"
      aria-checked={value === ""}
      class={chipClass(value === "")}
      onclick={() => select("")}
    >
      {allLabel}
    </button>
  {/if}
  {#each options as opt (opt.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === opt.value}
      class={chipClass(value === opt.value)}
      title={opt.title}
      onclick={() => select(opt.value)}
    >
      {opt.label}
    </button>
  {/each}
</div>
