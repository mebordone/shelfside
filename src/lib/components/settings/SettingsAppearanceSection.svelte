<script lang="ts">
  import { appLocale, t, type AppLocale } from "$lib/i18n";
  import { setTheme, theme } from "$lib/stores/theme.svelte";

  interface Props {
    onLocaleChange: (locale: AppLocale) => void;
  }

  let { onLocaleChange }: Props = $props();
</script>

<section class="space-y-3">
  <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
    {t("settings.appearance")}
  </h2>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs text-zinc-500">{t("theme.toggle")}</span>
    <button
      type="button"
      class="rounded-md border px-2.5 py-1 text-xs {theme.mode === 'light'
        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
        : 'border-zinc-300 dark:border-zinc-700'}"
      onclick={() => setTheme("light")}>{t("theme.light")}</button
    >
    <button
      type="button"
      class="rounded-md border px-2.5 py-1 text-xs {theme.mode === 'dark'
        ? 'border-emerald-600 bg-emerald-950 text-emerald-100'
        : 'border-zinc-300 dark:border-zinc-700'}"
      onclick={() => setTheme("dark")}>{t("theme.dark")}</button
    >
  </div>
  <div class="space-y-1">
    <label class="text-xs text-zinc-500" for="locale-select">{t("settings.language")}</label>
    <select
      id="locale-select"
      class="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      value={appLocale.current}
      onchange={(e) => onLocaleChange((e.currentTarget as HTMLSelectElement).value as AppLocale)}
    >
      <option value="es">{t("settings.language.es")}</option>
      <option value="en">{t("settings.language.en")}</option>
    </select>
  </div>
</section>
