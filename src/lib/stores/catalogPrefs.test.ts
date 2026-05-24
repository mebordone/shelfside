import { beforeEach, describe, expect, it } from "vitest";
import {
  persistCatalogLang,
  persistOlStrictLanguage,
  readCatalogLang,
  readOlStrictLanguage,
} from "./catalogPrefs";

describe("catalogPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("readCatalogLang devuelve follow_ui por defecto", () => {
    expect(readCatalogLang()).toBe("follow_ui");
  });

  it("persistCatalogLang guarda es o en", () => {
    persistCatalogLang("en");
    expect(readCatalogLang()).toBe("en");
  });

  it("readOlStrictLanguage es false por defecto", () => {
    expect(readOlStrictLanguage()).toBe(false);
    persistOlStrictLanguage(true);
    expect(readOlStrictLanguage()).toBe(true);
  });
});
