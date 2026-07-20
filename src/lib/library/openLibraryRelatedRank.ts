import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import {
  authorKeysFromSearchDoc,
  mapSearchDocToHit,
  seriesKeysFromSearchDoc,
  type OlSearchDoc,
} from "$lib/api/openlibrary/parse";
import { RELATED_OPEN_LIBRARY_HITS_CAP } from "./openLibraryRelatedHits";
import { normalizeSubject } from "./openLibraryRelatedSubjects";

export type RelatedCandidateSource = "series" | "author" | "subject_pair" | "subject";

/** Hit de search enriquecido para ranking de relacionados (interno). */
export type RelatedBookCandidate = OpenLibrarySearchHit & {
  authorKeys: string[];
  subjectSlugs: string[];
  seriesKeys: string[];
  sources: RelatedCandidateSource[];
};

/**
 * Mapea un doc de search.json (con fields enriquecidos) a candidato de related.
 */
export function mapSearchDocToRelatedCandidate(
  doc: OlSearchDoc,
  source: RelatedCandidateSource,
): RelatedBookCandidate | null {
  const hit = mapSearchDocToHit(doc);
  if (!hit) return null;

  const subjectSlugs: string[] = [];
  const seenSub = new Set<string>();
  for (const raw of doc.subject ?? []) {
    const slug = normalizeSubject(raw);
    if (!slug || seenSub.has(slug)) continue;
    seenSub.add(slug);
    subjectSlugs.push(slug);
  }

  return {
    ...hit,
    authorKeys: authorKeysFromSearchDoc(doc),
    subjectSlugs,
    seriesKeys: seriesKeysFromSearchDoc(doc),
    sources: [source],
  };
}

export type RelatedOriginContext = {
  year: number | null;
  authorKeys: string[];
  seriesKeys: string[];
  /** Slugs priorizados del origen (género + temas). */
  subjectSlugs: string[];
  /** Género principal del origen, si hay. */
  primaryGenre: string | null;
  excludeEditionId: string | null;
  excludeWorkKey: string | null;
};

function setsOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

function sharedCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const x of a) {
    if (setB.has(x)) n += 1;
  }
  return n;
}

/** Puntúa un candidato respecto al libro origen. */
export function scoreRelatedCandidate(
  c: RelatedBookCandidate,
  origin: RelatedOriginContext,
): number {
  let score = 0;
  const sameSeries = setsOverlap(c.seriesKeys, origin.seriesKeys);
  const sameAuthor = setsOverlap(c.authorKeys, origin.authorKeys);

  if (sameSeries) score += 100;
  if (sameAuthor) score += 45;
  if (c.sources.includes("subject_pair")) score += 40;

  const shared = sharedCount(c.subjectSlugs, origin.subjectSlugs);
  score += Math.min(36, shared * 12);

  if (origin.primaryGenre && c.subjectSlugs.includes(origin.primaryGenre)) {
    score += 20;
  }

  if (origin.year != null && c.year > 0) {
    const gap = Math.abs(c.year - origin.year);
    if (gap <= 20) score += 15;
    else if (gap <= 50) score += 8;
    else if (gap > 100 && !sameSeries && !sameAuthor) score -= 8;
  }

  // Solo overlap genérico residual (pocos subjects compartidos y sin señales fuertes)
  if (!sameSeries && !sameAuthor && shared === 0 && !c.sources.includes("subject_pair")) {
    score -= 30;
  }

  if (!c.coverUrl) score -= 5;

  return score;
}

/**
 * Fusiona candidatos por workKey, acumulando sources, y ordena por score.
 */
export function mergeCandidatesByWork(
  lists: RelatedBookCandidate[][],
  origin: RelatedOriginContext,
): RelatedBookCandidate[] {
  const byWork = new Map<string, RelatedBookCandidate>();

  for (const list of lists) {
    for (const c of list) {
      if (origin.excludeEditionId && c.editionId === origin.excludeEditionId) continue;
      if (origin.excludeWorkKey && c.workKey === origin.excludeWorkKey) continue;

      const prev = byWork.get(c.workKey);
      if (!prev) {
        byWork.set(c.workKey, { ...c, sources: [...c.sources] });
        continue;
      }
      const sources = new Set([...prev.sources, ...c.sources]);
      const authorKeys = [...new Set([...prev.authorKeys, ...c.authorKeys])];
      const subjectSlugs = [...new Set([...prev.subjectSlugs, ...c.subjectSlugs])];
      const seriesKeys = [...new Set([...prev.seriesKeys, ...c.seriesKeys])];
      byWork.set(c.workKey, {
        ...prev,
        // Preferir el que tenga cover si el otro no
        coverUrl: prev.coverUrl ?? c.coverUrl,
        authorKeys,
        subjectSlugs,
        seriesKeys,
        sources: [...sources],
      });
    }
  }

  const scored = [...byWork.values()].map((c) => ({
    c,
    score: scoreRelatedCandidate(c, origin),
  }));
  scored.sort((a, b) => b.score - a.score || a.c.title.localeCompare(b.c.title));
  return scored.map((s) => s.c);
}

type QuotaKind = "series" | "author" | "thematic" | "distant";

function classifyQuota(c: RelatedBookCandidate, origin: RelatedOriginContext): QuotaKind {
  if (setsOverlap(c.seriesKeys, origin.seriesKeys)) return "series";
  if (setsOverlap(c.authorKeys, origin.authorKeys)) return "author";
  if (
    origin.year != null &&
    c.year > 0 &&
    Math.abs(c.year - origin.year) > 100 &&
    origin.year >= 1950
  ) {
    return "distant";
  }
  return "thematic";
}

/**
 * Diversifica el top: máx 4 serie, máx 2 autor extra, máx 2 lejanos en año.
 * Rellena el resto con temáticos / lo que quede por score.
 */
export function diversifyRelatedCandidates(
  ranked: RelatedBookCandidate[],
  origin: RelatedOriginContext,
  cap: number = RELATED_OPEN_LIBRARY_HITS_CAP,
): RelatedBookCandidate[] {
  const maxSeries = 4;
  const maxAuthorExtra = 2;
  const maxDistant = origin.year != null && origin.year >= 1950 ? 2 : cap;

  const out: RelatedBookCandidate[] = [];
  const used = new Set<string>();
  let seriesCount = 0;
  let authorCount = 0;
  let distantCount = 0;

  const tryTake = (c: RelatedBookCandidate, kind: QuotaKind): boolean => {
    if (used.has(c.workKey)) return false;
    if (kind === "series" && seriesCount >= maxSeries) return false;
    if (kind === "author" && authorCount >= maxAuthorExtra) return false;
    if (kind === "distant" && distantCount >= maxDistant) return false;
    used.add(c.workKey);
    out.push(c);
    if (kind === "series") seriesCount += 1;
    if (kind === "author") authorCount += 1;
    if (kind === "distant") distantCount += 1;
    return true;
  };

  // Primera pasada: respetando cuotas
  for (const c of ranked) {
    if (out.length >= cap) break;
    tryTake(c, classifyQuota(c, origin));
  }

  // Segunda pasada: rellenar solo con temáticos (no romper cuotas de serie/autor/lejanos)
  if (out.length < cap) {
    for (const c of ranked) {
      if (out.length >= cap) break;
      if (used.has(c.workKey)) continue;
      const kind = classifyQuota(c, origin);
      if (kind === "series" || kind === "author" || kind === "distant") continue;
      used.add(c.workKey);
      out.push(c);
    }
  }

  return out;
}

/** Pipeline completo: merge + score + diversify → hits públicos. */
export function rankRelatedOpenLibraryHits(
  lists: RelatedBookCandidate[][],
  origin: RelatedOriginContext,
  cap: number = RELATED_OPEN_LIBRARY_HITS_CAP,
): OpenLibrarySearchHit[] {
  const merged = mergeCandidatesByWork(lists, origin);
  const diversified = diversifyRelatedCandidates(merged, origin, cap);
  return diversified.map(({ authorKeys: _a, subjectSlugs: _s, seriesKeys: _k, sources: _src, ...hit }) => hit);
}
