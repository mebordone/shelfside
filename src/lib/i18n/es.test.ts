import { describe, expect, it } from "vitest";
import { t } from "./es";

describe("i18n es", () => {
  it("resuelve claves conocidas", () => {
    expect(t("app.title")).toBe("Shelfside");
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(t("no.existe")).toBe("no.existe");
  });
});
