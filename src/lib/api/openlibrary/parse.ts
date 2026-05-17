import { coverUrlFromCoverId, coverUrlFromEditionOlid } from "./covers";
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

function resolveCoverUrl(editionOlid: string | null, coverId: number | undefined): string | null {
  if (typeof coverId === "number" && coverId > 0) return coverUrlFromCoverId(coverId);
  if (editionOlid) return coverUrlFromEditionOlid(editionOlid);
  return null;
}

function searchDocIds(doc: OlSearchDoc): { editionOlid: string; workOlid: string; edition: OlEditionDoc | undefined } | null {
  const edition = doc.editions?.docs?.[0];
  const editionOlid = olidFromKey(edition?.key);
  const workOlid = olidFromKey(doc.key);
  if (!editionOlid || !workOlid) return null;
  return { editionOlid, workOlid, edition };
}

export function mapSearchDocToHit(doc: OlSearchDoc): OpenLibrarySearchHit | null {
  const title = doc.title?.trim();
  const authors = (doc.author_name ?? []).filter((a) => typeof a === "string" && a.trim());
  if (!title || authors.length === 0) return null;

  const ids = searchDocIds(doc);
  if (!ids) return null;

  const year = pickYear(doc.first_publish_year, ids.edition?.publish_year);
  if (year == null) return null;

  return {
    editionId: ids.editionOlid,
    workKey: ids.workOlid,
    title,
    authors,
    year,
    coverUrl: resolveCoverUrl(ids.editionOlid, ids.edition?.cover_i ?? doc.cover_i),
  };
}
