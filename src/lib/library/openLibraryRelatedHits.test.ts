import { describe, expect, it } from "vitest";
import { mergeRelatedOpenLibraryHits } from "./openLibraryRelatedHits";

describe("mergeRelatedOpenLibraryHits", () => {
  const hit = (editionId: string) => ({
    editionId,
    workKey: "OL1W",
    title: "T",
    authors: ["A"],
    year: 2000,
    coverUrl: null,
  });

  it("deduplica y excluye edición actual", () => {
    const out = mergeRelatedOpenLibraryHits(
      [[hit("OL1M"), hit("OL2M")], [hit("OL2M"), hit("OL3M")]],
      { cap: 10, excludeEditionId: "OL1M" },
    );
    expect(out.map((h) => h.editionId)).toEqual(["OL2M", "OL3M"]);
  });

  it("respeta cap", () => {
    const out = mergeRelatedOpenLibraryHits([[hit("A"), hit("B"), hit("C")]], { cap: 2 });
    expect(out).toHaveLength(2);
  });
});
