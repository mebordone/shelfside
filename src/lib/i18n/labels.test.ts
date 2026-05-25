import { beforeEach, describe, expect, it } from "vitest";
import { appLocale } from "./locale.svelte";
import { labelForMedia, labelForStatus } from "./labels";

describe("labelForStatus", () => {
  beforeEach(() => {
    appLocale.current = "es";
  });

  it("traduce estados conocidos", () => {
    expect(labelForStatus("completed")).toBe("Completado");
    expect(labelForStatus("planning")).toBe("Planeado");
  });

  it("devuelve el id si no hay clave", () => {
    expect(labelForStatus("custom_unknown")).toBe("custom_unknown");
  });
});

describe("labelForMedia", () => {
  beforeEach(() => {
    appLocale.current = "es";
  });

  it("traduce tipos conocidos", () => {
    expect(labelForMedia("book")).toBe("Libro");
    expect(labelForMedia("movie")).toBe("Película");
  });

  it("devuelve el id si no hay clave", () => {
    expect(labelForMedia("podcast")).toBe("podcast");
  });
});
