import { coverUrlFromCoverId } from "./covers";
import type { OpenLibrarySearchHit } from "./types";

export type OlSearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  editions?: { docs?: OlEditionDoc[] };
};

export type OlEditionDoc = {
  key?: string;
  title?: string;
  publish_year?: number;
  language?: string[];
  isbn?: string[];
  cover_i?: number;
};

export function olidFromKey(key: string | undefined): string | null {
  if (!key) return null;
  const m = key.match(/\/(books|works|authors)\/(OL[\dA-Z]+[WMA]?)/i);
  return m?.[2] ?? null;
}

function pickYear(workYear: number | undefined, editionYear: number | undefined): number | null {
  if (typeof editionYear === "number" && editionYear > 0) return editionYear;
  if (typeof workYear === "number" && workYear > 0) return workYear;
  return null;
}

function resolveCoverUrl(_editionOlid: string | null, coverId: number | undefined): string | null {
  if (typeof coverId === "number" && coverId > 0) return coverUrlFromCoverId(coverId);
  return null;
}

function searchDocIds(doc: OlSearchDoc): { editionOlid: string; workOlid: string; edition: OlEditionDoc | undefined } | null {
  const edition = doc.editions?.docs?.[0];
  const editionOlid = olidFromKey(edition?.key);
  const workOlid = olidFromKey(doc.key);
  if (!editionOlid || !workOlid) return null;
  return { editionOlid, workOlid, edition };
}

export function resolveSearchDisplayTitle(
  workTitle: string,
  editionTitle: string | undefined,
): { title: string; workTitle?: string } {
  const work = workTitle.trim();
  const edition = editionTitle?.trim();
  if (edition && edition !== work) {
    return { title: edition, workTitle: work };
  }
  return { title: work };
}

function hitFromSearchDoc(
  doc: OlSearchDoc,
  ids: { editionOlid: string; workOlid: string; edition: OlEditionDoc | undefined },
  authors: string[],
  year: number,
): OpenLibrarySearchHit {
  const workTitle = doc.title!.trim();
  const { title, workTitle: altWorkTitle } = resolveSearchDisplayTitle(
    workTitle,
    ids.edition?.title,
  );
  return {
    editionId: ids.editionOlid,
    workKey: ids.workOlid,
    title,
    ...(altWorkTitle ? { workTitle: altWorkTitle } : {}),
    authors,
    year,
    coverUrl: resolveCoverUrl(ids.editionOlid, ids.edition?.cover_i ?? doc.cover_i),
  };
}

export function mapSearchDocToHit(doc: OlSearchDoc): OpenLibrarySearchHit | null {
  const workTitle = doc.title?.trim();
  const authors = (doc.author_name ?? []).filter((a) => typeof a === "string" && a.trim());
  if (!workTitle || authors.length === 0) return null;

  const ids = searchDocIds(doc);
  if (!ids) return null;

  const year = pickYear(doc.first_publish_year, ids.edition?.publish_year);
  if (year == null) return null;

  return hitFromSearchDoc(doc, ids, authors, year);
}
