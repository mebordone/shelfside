import { describe, expect, it } from "vitest";
import type { RelatedBookCandidate } from "./openLibraryRelatedRank";
import {
  diversifyRelatedCandidates,
  mergeCandidatesByWork,
  rankRelatedOpenLibraryHits,
  scoreRelatedCandidate,
  type RelatedOriginContext,
} from "./openLibraryRelatedRank";

function cand(
  partial: Partial<RelatedBookCandidate> & Pick<RelatedBookCandidate, "editionId" | "workKey" | "title">,
): RelatedBookCandidate {
  return {
    authors: ["X"],
    year: 1970,
    coverUrl: "https://example.com/c.jpg",
    authorKeys: [],
    subjectSlugs: [],
    seriesKeys: [],
    sources: ["subject"],
    ...partial,
  };
}

const duneOrigin: RelatedOriginContext = {
  year: 1965,
  authorKeys: ["OL79034A"],
  seriesKeys: ["OL331367L"],
  subjectSlugs: ["science_fiction", "ecology", "fantasy_fiction"],
  primaryGenre: "science_fiction",
  excludeEditionId: "OL_DUNE_M",
  excludeWorkKey: "OL893415W",
};

describe("scoreRelatedCandidate", () => {
  it("prioriza misma serie y autor sobre clásicos lejanos", () => {
    const messiah = cand({
      editionId: "OL_MES_M",
      workKey: "OL893526W",
      title: "Dune Messiah",
      year: 1969,
      authorKeys: ["OL79034A"],
      seriesKeys: ["OL331367L"],
      subjectSlugs: ["science_fiction"],
      sources: ["series"],
    });
    const frankenstein = cand({
      editionId: "OL_FR_M",
      workKey: "OL450063W",
      title: "Frankenstein",
      year: 1818,
      authorKeys: ["OL25342A"],
      subjectSlugs: ["science_fiction", "horror"],
      sources: ["subject"],
    });
    const pride = cand({
      editionId: "OL_PR_M",
      workKey: "OL66554W",
      title: "Pride and Prejudice",
      year: 1813,
      authorKeys: ["OL21594A"],
      subjectSlugs: ["fiction"],
      sources: ["subject"],
    });

    const sM = scoreRelatedCandidate(messiah, duneOrigin);
    const sF = scoreRelatedCandidate(frankenstein, duneOrigin);
    const sP = scoreRelatedCandidate(pride, duneOrigin);
    expect(sM).toBeGreaterThan(sF);
    expect(sF).toBeGreaterThan(sP);
  });
});

describe("mergeCandidatesByWork", () => {
  it("deduplica por workKey y acumula sources", () => {
    const a = cand({
      editionId: "OL1M",
      workKey: "OL1W",
      title: "A",
      sources: ["author"],
      authorKeys: ["OL79034A"],
    });
    const b = cand({
      editionId: "OL1Mb",
      workKey: "OL1W",
      title: "A alt",
      sources: ["series"],
      seriesKeys: ["OL331367L"],
    });
    const merged = mergeCandidatesByWork([[a], [b]], duneOrigin);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.sources.sort()).toEqual(["author", "series"]);
    expect(merged[0]?.seriesKeys).toContain("OL331367L");
  });

  it("excluye work y edition del origen", () => {
    const self = cand({
      editionId: "OL_DUNE_M",
      workKey: "OL893415W",
      title: "Dune",
    });
    const other = cand({ editionId: "OL2M", workKey: "OL2W", title: "Other" });
    const merged = mergeCandidatesByWork([[self, other]], duneOrigin);
    expect(merged.map((c) => c.workKey)).toEqual(["OL2W"]);
  });
});

describe("diversifyRelatedCandidates", () => {
  it("limita cuántos de la misma serie en el top", () => {
    const seriesBooks = Array.from({ length: 8 }, (_, i) =>
      cand({
        editionId: `OLs${i}M`,
        workKey: `OLs${i}W`,
        title: `Series ${i}`,
        authorKeys: ["OL79034A"],
        seriesKeys: ["OL331367L"],
        subjectSlugs: ["science_fiction"],
        sources: ["series"],
        year: 1965 + i,
      }),
    );
    const thematic = cand({
      editionId: "OLtM",
      workKey: "OLtW",
      title: "Thematic",
      subjectSlugs: ["science_fiction", "ecology"],
      sources: ["subject_pair"],
      year: 1975,
    });
    const ranked = mergeCandidatesByWork([[...seriesBooks, thematic]], duneOrigin);
    const out = diversifyRelatedCandidates(ranked, duneOrigin, 8);
    const seriesCount = out.filter((c) => c.seriesKeys.includes("OL331367L")).length;
    expect(seriesCount).toBeLessThanOrEqual(4);
    expect(out.some((c) => c.workKey === "OLtW")).toBe(true);
  });
});

describe("rankRelatedOpenLibraryHits", () => {
  it("devuelve hits públicos con Messiah delante de Frankenstein", () => {
    const messiah = cand({
      editionId: "OL_MES_M",
      workKey: "OL893526W",
      title: "Dune Messiah",
      year: 1969,
      authorKeys: ["OL79034A"],
      seriesKeys: ["OL331367L"],
      subjectSlugs: ["science_fiction"],
      sources: ["series", "author"],
    });
    const frankenstein = cand({
      editionId: "OL_FR_M",
      workKey: "OL450063W",
      title: "Frankenstein",
      year: 1818,
      subjectSlugs: ["science_fiction"],
      sources: ["subject"],
    });
    const hits = rankRelatedOpenLibraryHits([[messiah, frankenstein]], duneOrigin, 10);
    expect(hits[0]?.title).toBe("Dune Messiah");
    expect(hits[0]).not.toHaveProperty("sources");
    expect(hits.map((h) => h.title)).toContain("Frankenstein");
  });
});
