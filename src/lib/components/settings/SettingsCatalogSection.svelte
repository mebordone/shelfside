<script lang="ts">
  import { t } from "$lib/i18n";
  import type { CatalogLangPreference } from "$lib/stores/catalogPrefs";

  interface Props {
    catalogLang: CatalogLangPreference;
    olStrict: boolean;
    onCatalogLangChange: (value: CatalogLangPreference) => void;
    onOlStrictChange: (checked: boolean) => void;
  }

  let { catalogLang, olStrict, onCatalogLangChange, onOlStrictChange }: Props = $props();
</script>

<section class="space-y-3">
  <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
    {t("settings.catalog")}
  </h2>
  <p class="text-xs text-zinc-600 dark:text-zinc-400">{t("settings.catalog_help")}</p>
  <div class="space-y-1">
    <label class="text-xs text-zinc-500" for="catalog-lang-select">{t("settings.catalog_lang")}</label>
    <select
      id="catalog-lang-select"
      class="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      value={catalogLang}
      onchange={(e) =>
        onCatalogLangChange((e.currentTarget as HTMLSelectElement).value as CatalogLangPreference)}
    >
      <option value="follow_ui">{t("settings.catalog_lang.follow_ui")}</option>
      <option value="es">{t("settings.catalog_lang.es")}</option>
      <option value="en">{t("settings.catalog_lang.en")}</option>
    </select>
  </div>
  <label class="flex cursor-pointer items-start gap-2 text-sm">
    <input
      type="checkbox"
      class="mt-0.5"
      checked={olStrict}
      onchange={(e) => onOlStrictChange((e.currentTarget as HTMLInputElement).checked)}
    />
    <span>
      <span class="font-medium">{t("settings.ol_strict")}</span>
      <span class="mt-0.5 block text-xs text-zinc-500">{t("settings.ol_strict_help")}</span>
    </span>
  </label>
</section>
