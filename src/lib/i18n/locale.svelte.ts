import { enMessages } from "./en";
import { esMessages } from "./es";

export type AppLocale = "es" | "en";

const LOCALE_KEY = "shelfside-locale";

const catalogs: Record<AppLocale, Record<string, string>> = {
  es: esMessages,
  en: enMessages,
};

function readInitial(): AppLocale {
  if (typeof localStorage === "undefined") return "es";
  const v = localStorage.getItem(LOCALE_KEY);
  return v === "en" ? "en" : "es";
}

/** Idioma UI (persistido). Mutar solo `appLocale.current`. */
export const appLocale = $state({ current: readInitial() });

export function getAppLocale(): AppLocale {
  return appLocale.current;
}

export function setAppLocale(locale: AppLocale): void {
  appLocale.current = locale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCALE_KEY, locale);
  }
}

export function initAppLocale(): void {
  appLocale.current = readInitial();
}

export function t(key: string): string {
  const loc = appLocale.current;
  return catalogs[loc][key] ?? catalogs.es[key] ?? key;
}
