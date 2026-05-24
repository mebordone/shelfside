import { beforeEach, describe, expect, it } from "vitest";
import { appLocale } from "./locale.svelte";
import {
  buildOpenLibrarySearchQuery,
  getOpenLibraryLangParam,
  getTmdbLanguageParam,
  resolveCatalogLang,
  withTmdbLocaleParams,
} from "./catalogLocale";
import { persistCatalogLang, persistOlStrictLanguage } from "$lib/stores/catalogPrefs";

describe("catalogLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    appLocale.current = "es";
  });

  it("resolveCatalogLang sigue appLocale con follow_ui", () => {
    appLocale.current = "en";
    expect(resolveCatalogLang()).toBe("en");
    persistCatalogLang("es");
    expect(resolveCatalogLang()).toBe("es");
  });

  it("buildOpenLibrarySearchQuery añade language:spa si strict en español", () => {
    persistOlStrictLanguage(true);
    expect(buildOpenLibrarySearchQuery("fundacion")).toBe("fundacion language:spa");
  });

  it("buildOpenLibrarySearchQuery no duplica language:", () => {
    persistOlStrictLanguage(true);
    expect(buildOpenLibrarySearchQuery("foo language:eng")).toBe("foo language:eng");
  });

  it("getOpenLibraryLangParam y TMDB locale", () => {
    persistCatalogLang("en");
    expect(getOpenLibraryLangParam()).toBe("en");
    expect(getTmdbLanguageParam()).toBe("en-US");
    expect(withTmdbLocaleParams("/search/multi?query=x")).toContain("language=en-US");
    expect(withTmdbLocaleParams("/search/multi?query=x")).toContain("region=US");
  });
});
