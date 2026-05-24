export type CatalogLangPreference = "follow_ui" | "es" | "en";

const CATALOG_LANG_KEY = "shelfside-catalog-lang";
const OL_STRICT_KEY = "shelfside-ol-strict-language";

export function readCatalogLang(): CatalogLangPreference {
  if (typeof localStorage === "undefined") return "follow_ui";
  const v = localStorage.getItem(CATALOG_LANG_KEY);
  if (v === "es" || v === "en") return v;
  return "follow_ui";
}

export function persistCatalogLang(value: CatalogLangPreference): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CATALOG_LANG_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readOlStrictLanguage(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(OL_STRICT_KEY) === "1";
}

export function persistOlStrictLanguage(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OL_STRICT_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
