/** Locale de la aplicación (v1: español). */
export type AppLocale = "es";

export function getAppLocale(): AppLocale {
  return "es";
}

/** ISO 639-1 para parámetro `lang` de Open Library Search API. */
export function getOpenLibraryLangParam(): string {
  const locale = getAppLocale();
  if (locale === "es") return "es";
  return "en";
}
