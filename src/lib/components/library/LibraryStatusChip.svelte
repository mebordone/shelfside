<script lang="ts">
  import type { Status } from "$lib/db/types";
  import { STATUSES } from "$lib/db/types";
  import { t } from "$lib/i18n";
  import { labelForStatus } from "$lib/i18n/labels";

  interface Props {
    status: Status;
    busy?: boolean;
    onChange: (status: Status) => void | Promise<void>;
  }

  let { status, busy = false, onChange }: Props = $props();

  let open = $state(false);
  let saving = $state(false);

  async function pick(st: Status) {
    if (busy || saving) return;
    if (st === status) {
      open = false;
      return;
    }
    saving = true;
    try {
      await onChange(st);
      open = false;
    } finally {
      saving = false;
    }
  }
</script>

<button
  type="button"
  class="shelf-touch inline-flex min-h-11 items-center rounded-full border border-emerald-600/40 bg-emerald-50 px-3 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-950"
  disabled={busy || saving}
  aria-expanded={open}
  aria-haspopup="dialog"
  onclick={() => {
    open = !open;
  }}
>
  {labelForStatus(status)}
</button>

{#if open}
  <div class="fixed inset-0 z-50" data-testid="status-picker">
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label={t("common.close")}
      onclick={() => {
        open = false;
      }}
    ></button>
    <div
      class="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-zinc-200 bg-zinc-50 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      role="dialog"
      aria-modal="true"
      aria-label={t("edit.status")}
    >
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true"></div>
      <p class="px-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("edit.status")}</p>
      <ul class="mt-2 flex flex-col gap-1 px-2 pb-2">
        {#each STATUSES as st (st)}
          <li>
            <button
              type="button"
              class="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium transition-colors {status === st
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-800 hover:bg-zinc-200 dark:text-zinc-100 dark:hover:bg-zinc-800'}"
              disabled={busy || saving}
              onclick={() => void pick(st)}
            >
              {labelForStatus(st)}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
