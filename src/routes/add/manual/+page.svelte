<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { open } from "@tauri-apps/plugin-dialog";
  import { getDatabase } from "$lib/db/connection";
  import { addManualToLibrary } from "$lib/db";
  import { guessImageExtFromPath, saveManualPosterCopy } from "$lib/poster";
  import { t } from "$lib/i18n/es";

  let title = $state("");
  let mediaType = $state<"movie" | "tv">("movie");
  let notes = $state("");
  let pickedPath = $state<string | null>(null);
  let saving = $state(false);
  let err = $state<string | null>(null);

  async function pickImage() {
    err = null;
    try {
      const sel = await open({
        multiple: false,
        filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      });
      if (typeof sel === "string") {
        pickedPath = sel;
      } else {
        pickedPath = null;
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
  }

  async function submit() {
    if (!title.trim()) return;
    saving = true;
    err = null;
    try {
      let posterLocal: string | null = null;
      if (pickedPath) {
        const ext = guessImageExtFromPath(pickedPath);
        const rel = `posters/manual_${crypto.randomUUID()}.${ext}`;
        posterLocal = await saveManualPosterCopy(pickedPath, rel);
      }
      const db = await getDatabase();
      const { libraryId } = await addManualToLibrary(db, {
        title: title.trim(),
        media_type: mediaType,
        notes: notes.trim() || null,
        posterLocalPath: posterLocal,
      });
      await goto(resolve("/library/[id]", { id: String(libraryId) }));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }
</script>

<div class="mx-auto max-w-lg space-y-6 px-4 py-8">
  <h1 class="text-2xl font-semibold">{t("manual.title")}</h1>
  <p class="text-sm text-zinc-600 dark:text-zinc-400">{t("manual.subtitle")}</p>

  {#if err}
    <p class="text-sm text-red-600 dark:text-red-400">{err}</p>
  {/if}

  <form
    class="space-y-4"
    onsubmit={(e) => {
      e.preventDefault();
      void submit();
    }}
  >
    <label class="block text-sm">
      <span class="text-zinc-600 dark:text-zinc-400">{t("manual.field_title")}</span>
      <input
        required
        class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        bind:value={title}
      />
    </label>

    <label class="block text-sm">
      <span class="text-zinc-600 dark:text-zinc-400">{t("manual.field_type")}</span>
      <select
        class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        bind:value={mediaType}
      >
        <option value="movie">{t("media.movie")}</option>
        <option value="tv">{t("media.tv")}</option>
      </select>
    </label>

    <label class="block text-sm">
      <span class="text-zinc-600 dark:text-zinc-400">{t("manual.field_notes")}</span>
      <textarea
        rows="3"
        class="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        bind:value={notes}
      ></textarea>
    </label>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        onclick={() => void pickImage()}
      >
        {t("manual.pick_image")}
      </button>
      {#if pickedPath}
        <span class="text-xs text-emerald-600 dark:text-emerald-400">{t("manual.image_picked")}</span>
      {/if}
    </div>

    <button
      type="submit"
      class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      disabled={saving}
    >
      {t("manual.submit")}
    </button>
  </form>
</div>
