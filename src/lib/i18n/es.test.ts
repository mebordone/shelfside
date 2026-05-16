import { describe, expect, it } from "vitest";
import { t } from "./es";

describe("i18n es", () => {
  it("resuelve claves conocidas", () => {
    expect(t("app.title")).toBe("Shelfside");
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(t("no.existe")).toBe("no.existe");
  });

  it("incluye microcopy de sugerencias TMDB y pista en listado", () => {
    expect(t("detail.related_subtitle")).toMatch(/TMDB/i);
    expect(t("detail.related_add_hint")).toMatch(/\+/);
    expect(t("search.add_status_hint")).toMatch(/Añadir/i);
  });
});
