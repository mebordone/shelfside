<script lang="ts">
  import { resolve } from "$app/paths";
  import { longPress } from "$lib/actions/longPress";
  import type { LibraryListRow } from "$lib/db";
  import { t } from "$lib/i18n";
  import { labelForMedia } from "$lib/i18n/labels";
  import { formatTvProgress } from "$lib/library/formatTvProgress";
  import type { WithDisplayUrl } from "$lib/poster";

  type Row = WithDisplayUrl<LibraryListRow>;

  interface Props {
    row: Row;
    onLongPress: (row: Row) => void;
    onQuickEdit: (row: Row) => void;
    /** `carousel`: ancho fijo en Inicio; `grid`: ocupa la celda de la grilla. */
    layout?: "carousel" | "grid";
  }

  let { row, onLongPress, onQuickEdit, layout = "carousel" }: Props = $props();

  const progress = $derived(
    row.media_type === "tv"
      ? formatTvProgress(row.current_season, row.last_episode_watched)
      : null,
  );

  const shellClass = $derived(
    layout === "grid"
      ? "group relative flex w-full flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition hover:border-emerald-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500"
      : "group relative flex w-[6.75rem] shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition hover:border-emerald-400 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500",
  );
</script>

<div class={shellClass} use:longPress={() => onLongPress(row)}>
  <a class="flex flex-col gap-1.5" href={resolve("/library/[id]", { id: String(row.id) })}>
    {#if row.displayUrl}
      <img src={row.displayUrl} alt="" class="aspect-[2/3] w-full rounded object-cover" />
    {:else}
      <div class="aspect-[2/3] w-full rounded bg-zinc-200 dark:bg-zinc-800"></div>
    {/if}
    <p class="line-clamp-2 text-center text-[11px] font-medium leading-tight text-zinc-800 group-hover:underline dark:text-zinc-100">
      {row.title}
    </p>
    {#if progress}
      <p class="text-center text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">{progress}</p>
    {:else}
      <p class="text-center text-[10px] text-zinc-500 dark:text-zinc-400">{labelForMedia(row.media_type)}</p>
    {/if}
  </a>
  <button
    type="button"
    class="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-sm font-bold leading-none text-white shadow ring-1 ring-white/30 hover:bg-black/70"
    aria-label={t("quick_edit.open_aria")}
    title={t("quick_edit.title")}
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onQuickEdit(row);
    }}
  >
    …
  </button>
</div>
