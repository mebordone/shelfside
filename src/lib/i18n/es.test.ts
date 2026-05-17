import { describe, expect, it } from "vitest";
import { t } from "./es";

describe("i18n es", () => {
  it("resuelve claves conocidas", () => {
    expect(t("app.title")).toBe("Shelfside");
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(t("no.existe")).toBe("no.existe");
  });

  it("incluye microcopy de sugerencias y búsqueda unificada", () => {
    expect(t("detail.related_subtitle")).toMatch(/TMDB/i);
    expect(t("detail.related_openlibrary_heading")).toMatch(/Open Library/i);
    expect(t("detail.related_add_hint")).toMatch(/\+/);
    expect(t("search.add_status_hint")).toMatch(/Añadir/i);
    expect(t("nav.search")).toBe("Buscar");
    expect(t("media.book")).toBe("Libro");
    expect(t("search.source_tmdb_short")).toBe("Pelis y series");
    expect(t("search.source_openlibrary_short")).toBe("Libros");
  });
});
