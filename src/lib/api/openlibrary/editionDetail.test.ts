import { describe, expect, it } from "vitest";
import { buildOpenLibraryDetail, resolvePublicationYear } from "./editionDetail";

describe("resolvePublicationYear", () => {
  it("usa first_publish_year del work cuando no hay publish_date", () => {
    const y = resolvePublicationYear(
      { first_publish_year: 1951 },
      {},
    );
    expect(y).toBe(1951);
  });

  it("prioriza yearHint del listado de búsqueda", () => {
    const y = resolvePublicationYear({}, {}, 1951);
    expect(y).toBe(1951);
  });
});

describe("buildOpenLibraryDetail", () => {
  it("acepta yearHint sin campos de fecha en JSON", () => {
    const d = buildOpenLibraryDetail(
      "OL1M",
      { title: "Foundation" },
      { title: "Foundation" },
      "OL1W",
      ["Isaac Asimov"],
      null,
      1951,
    );
    expect(d.year).toBe(1951);
  });
});
