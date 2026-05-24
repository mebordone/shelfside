import { appLocale, type AppLocale } from "./locale.svelte";

export type { AppLocale };

/** ISO 639-1 para parámetro `lang` de Open Library Search API. */
export function getOpenLibraryLangParam(): string {
  if (appLocale.current === "es") return "es";
  return "en";
}
