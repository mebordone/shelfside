import { describe, expect, it } from "vitest";
import { enMessages } from "./en";
import { esMessages } from "./es";
import { initAppLocale, setAppLocale, t } from "./index";

describe("i18n", () => {
  it("es y en tienen las mismas claves", () => {
    const esKeys = Object.keys(esMessages).sort();
    const enKeys = Object.keys(enMessages).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("resuelve claves en español por defecto", () => {
    initAppLocale();
    setAppLocale("es");
    expect(t("app.title")).toBe("Shelfside");
    expect(t("nav.settings")).toBe("Configuración");
  });

  it("resuelve claves en inglés", () => {
    setAppLocale("en");
    expect(t("nav.settings")).toBe("Settings");
    expect(t("nav.stats")).toBe("Statistics");
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(t("no.existe")).toBe("no.existe");
  });

  it("incluye microcopy de sugerencias y búsqueda unificada en es", () => {
    setAppLocale("es");
    expect(t("detail.related_subtitle")).toMatch(/TMDB/i);
    expect(t("search.source_tmdb_short")).toBe("Pelis y series");
  });

  it("incluye claves de sync 3.3 en es y en", () => {
    setAppLocale("es");
    expect(t("settings.sync_now")).toBe("Sincronizar");
    expect(t("settings.sync_summary")).toContain("{imported}");
    expect(t("settings.sync_help")).toMatch(/shelfside\.csv/i);
    expect(t("settings.sync_folder_placeholder_android")).toMatch(/storage\/emulated\/0\/Sync/);
    expect(t("settings.sync_storage_permission_grant")).toMatch(/acceso/i);
    expect(t("settings.sync_on_start")).toBe("Sincronizar al abrir");
    expect(t("settings.sync_on_start_help")).toMatch(/iniciar/i);
    expect(t("sync.boot_running")).toBe("Sincronizando…");
    expect(t("common.close")).toBe("Cerrar");
    setAppLocale("en");
    expect(t("settings.sync_now")).toBe("Sync");
    expect(t("settings.sync_help")).toMatch(/shelfside\.csv/i);
    expect(t("settings.sync_folder_placeholder_android")).toMatch(/storage\/emulated\/0\/Sync/);
    expect(t("settings.sync_on_start")).toBe("Sync on open");
    expect(t("settings.sync_on_start_help")).toMatch(/starts/i);
    expect(t("sync.boot_running")).toBe("Syncing…");
    expect(t("common.close")).toBe("Close");
  });

  it("incluye claves de nav móvil 0.4.3 en es y en", () => {
    setAppLocale("es");
    expect(t("nav.more")).toBe("Más");
    expect(t("nav.more_aria")).toMatch(/Más/i);
    expect(t("nav.bottom_aria")).toMatch(/inferior/i);
    setAppLocale("en");
    expect(t("nav.more")).toBe("More");
    expect(t("nav.more_aria")).toMatch(/More/i);
    expect(t("nav.bottom_aria")).toMatch(/Bottom/i);
  });
});
