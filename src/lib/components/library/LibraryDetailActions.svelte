<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { LibraryListRow } from "$lib/db";
  import { t } from "$lib/i18n";

  interface Props {
    row: LibraryListRow;
    libraryId: number;
    busy: boolean;
    deleteConfirmOpen: boolean;
    showRepairCover: boolean;
    onRefreshTmdb: () => void;
    onRefreshOpenLibrary: () => void;
    onRepairCover: () => void;
    onDeleteConfirm: () => void;
    onDeleteCancel: () => void;
    onDeleteOpen: () => void;
  }

  let {
    row,
    libraryId,
    busy,
    deleteConfirmOpen,
    showRepairCover,
    onRefreshTmdb,
    onRefreshOpenLibrary,
    onRepairCover,
    onDeleteConfirm,
    onDeleteCancel,
    onDeleteOpen,
  }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#if row.source === "tmdb"}
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
      disabled={busy}
      onclick={() => onRefreshTmdb()}
    >
      {t("detail.refresh_tmdb")}
    </button>
  {/if}
  {#if row.source === "openlibrary"}
    <button
      type="button"
      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
      disabled={busy}
      onclick={() => onRefreshOpenLibrary()}
    >
      {t("detail.refresh_openlibrary")}
    </button>
    {#if showRepairCover}
      <button
        type="button"
        class="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-800 dark:border-amber-800 dark:text-amber-300"
        disabled={busy}
        onclick={() => onRepairCover()}
      >
        {t("detail.repair_cover")}
      </button>
    {/if}
  {/if}
  <button
    type="button"
    class="shelf-btn-primary px-3"
    disabled={busy}
    onclick={() => void goto(resolve("/library/[id]/edit", { id: String(libraryId) }))}
  >
    {t("detail.edit")}
  </button>
  <button
    type="button"
    class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
    disabled={busy}
    onclick={() => onDeleteOpen()}
  >
    {t("detail.delete")}
  </button>
</div>

{#if deleteConfirmOpen}
  <section
    class="rounded-md border border-red-200 bg-red-50/80 p-4 text-sm dark:border-red-900 dark:bg-red-950/30"
    role="alertdialog"
    aria-labelledby="delete-confirm-title"
  >
    <p id="delete-confirm-title" class="text-zinc-800 dark:text-zinc-200">{t("detail.delete_confirm")}</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        disabled={busy}
        onclick={() => onDeleteConfirm()}
      >
        {busy ? t("detail.deleting") : t("detail.delete_confirm_action")}
      </button>
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        disabled={busy}
        onclick={() => onDeleteCancel()}
      >
        {t("common.cancel")}
      </button>
    </div>
  </section>
{/if}
