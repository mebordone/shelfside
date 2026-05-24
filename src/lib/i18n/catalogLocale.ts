import { readCatalogLang, readOlStrictLanguage } from "$lib/stores/catalogPrefs";
import { appLocale } from "./locale.svelte";

export type ResolvedCatalogLang = "es" | "en";

export function resolveCatalogLang(): ResolvedCatalogLang {
  const pref = readCatalogLang();
  if (pref === "es" || pref === "en") return pref;
  return appLocale.current === "en" ? "en" : "es";
}

/** ISO 639-1 para parámetro `lang` de Open Library Search API. */
export function getOpenLibraryLangParam(): string {
  return resolveCatalogLang();
}

export function getOpenLibraryLanguageFilter(): "spa" | "eng" | null {
  if (!readOlStrictLanguage()) return null;
  return resolveCatalogLang() === "es" ? "spa" : "eng";
}

export function buildOpenLibrarySearchQuery(userQuery: string): string {
  const q = userQuery.trim();
  if (!q) return q;
  const filter = getOpenLibraryLanguageFilter();
  if (!filter) return q;
  if (/language\s*:/i.test(q)) return q;
  return `${q} language:${filter}`;
}

export function getTmdbLanguageParam(): string {
  return resolveCatalogLang() === "es" ? "es-ES" : "en-US";
}

export function getTmdbRegionParam(): string {
  return resolveCatalogLang() === "es" ? "ES" : "US";
}

export function withTmdbLocaleParams(pathWithQuery: string): string {
  const lang = getTmdbLanguageParam();
  const region = getTmdbRegionParam();
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  return `${pathWithQuery}${sep}language=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}`;
}
