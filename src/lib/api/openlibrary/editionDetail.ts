import type { OpenLibraryDetail } from "./types";
import { OpenLibraryHttpError } from "./errors";
import { olidFromKey, type OlSearchDoc } from "./parse";

export type OlEditionJson = {
  title?: string;
  publish_date?: string;
  publish_year?: number;
  covers?: number[];
  isbn_13?: string[];
  isbn_10?: string[];
  languages?: { key?: string }[];
  works?: { key?: string }[];
  description?: string | { value?: string };
  notes?: string | { value?: string };
};

export type OlWorkJson = {
  title?: string;
  description?: string | { value?: string };
  subjects?: string[];
  authors?: { author?: { key?: string }; key?: string }[];
  covers?: number[];
  first_publish_date?: string;
  /** Presente en /works/OL…W.json y en search.json. */
  first_publish_year?: number;
  /** Serie(s) a las que pertenece la obra. */
  series?: { series?: { key?: string }; key?: string; position?: string }[];
};

type OlFetch = <T>(path: string) => Promise<T>;

function yearFromPublishDate(date: string | undefined): number | null {
  if (!date || date.length < 4) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function textFromOlField(field: string | { value?: string } | undefined): string | null {
  if (field == null) return null;
  if (typeof field === "string") return field.trim() || null;
  const v = field.value?.trim();
  return v || null;
}

function pickYear(workYear: number | undefined, editionYear: number | undefined): number | null {
  if (typeof editionYear === "number" && editionYear > 0) return editionYear;
  if (typeof workYear === "number" && workYear > 0) return workYear;
  return null;
}

export async function resolveWorkKeyFromEdition(
  olFetch: OlFetch,
  edition: OlEditionJson,
  editionId: string,
): Promise<string> {
  const fromWorks = edition.works?.[0]?.key;
  const wk = olidFromKey(fromWorks);
  if (wk) return wk;
  const search = await olFetch<{ docs?: { key?: string }[] }>(
    `/search.json?q=key:/books/${editionId.replace(/^\/books\//, "")}&fields=key&limit=1`,
  );
  const docKey = search.docs?.[0]?.key;
  const fromDoc = olidFromKey(docKey);
  if (fromDoc && docKey?.includes("/works/")) return fromDoc;
  throw new OpenLibraryHttpError("No se pudo resolver la obra (work) de la edición.", 404);
}

export async function fetchAuthorNames(olFetch: OlFetch, work: OlWorkJson): Promise<string[]> {
  const names: string[] = [];
  for (const a of work.authors ?? []) {
    const key = a.author?.key ?? a.key;
    const authorOlid = olidFromKey(key);
    if (!authorOlid) continue;
    try {
      const aj = await olFetch<{ name?: string }>(`/authors/${authorOlid}.json`);
      if (aj.name?.trim()) names.push(aj.name.trim());
    } catch {
      /* omitir */
    }
  }
  return names;
}

function workPublicationYear(work: OlWorkJson): number | undefined {
  const fromDate = yearFromPublishDate(work.first_publish_date);
  if (fromDate != null) return fromDate;
  if (typeof work.first_publish_year === "number" && work.first_publish_year > 0) {
    return work.first_publish_year;
  }
  return undefined;
}

export function resolvePublicationYear(
  work: OlWorkJson,
  edition: OlEditionJson,
  yearHint?: number,
): number | null {
  if (typeof yearHint === "number" && yearHint > 0) return yearHint;
  return pickYear(
    workPublicationYear(work),
    edition.publish_year ?? yearFromPublishDate(edition.publish_date) ?? undefined,
  );
}

/** Misma fuente que search.json cuando /books o /works no traen año. */
export async function resolvePublicationYearFromSearch(
  olFetch: OlFetch,
  workKey: string,
  editionId: string,
): Promise<number | null> {
  try {
    const data = await olFetch<{ docs?: OlSearchDoc[] }>(
      `/search.json?q=key:/works/${workKey}&limit=1&fields=first_publish_year,editions&editions.fields=key,publish_year`,
    );
    const doc = data.docs?.[0];
    if (!doc) return null;
    const editionDoc = doc.editions?.docs?.find((e) => olidFromKey(e.key) === editionId);
    return pickYear(doc.first_publish_year, editionDoc?.publish_year);
  } catch {
    return null;
  }
}

function requireEditionYear(
  work: OlWorkJson,
  edition: OlEditionJson,
  yearHint?: number,
): number {
  const year = resolvePublicationYear(work, edition, yearHint) ?? 0;
  if (year <= 0) throw new OpenLibraryHttpError("Edición sin año.", 404);
  return year;
}

function editionLanguages(edition: OlEditionJson): string[] {
  return (edition.languages ?? [])
    .map((l) => l.key?.replace(/^\/languages\//, "") ?? "")
    .filter(Boolean);
}

function editionOverview(edition: OlEditionJson, work: OlWorkJson): string | null {
  return (
    textFromOlField(edition.description) ??
    textFromOlField(edition.notes) ??
    textFromOlField(work.description)
  );
}

export function buildOpenLibraryDetail(
  olid: string,
  edition: OlEditionJson,
  work: OlWorkJson,
  workKey: string,
  authorNames: string[],
  coverUrl: string | null,
  yearHint?: number,
): OpenLibraryDetail {
  const title = (edition.title ?? work.title ?? "").trim();
  if (!title) throw new OpenLibraryHttpError("Edición sin título.", 404);
  if (authorNames.length === 0) throw new OpenLibraryHttpError("Edición sin autores.", 404);

  return {
    editionId: olid,
    workKey,
    title,
    authors: authorNames,
    year: requireEditionYear(work, edition, yearHint),
    overview: editionOverview(edition, work),
    isbn: edition.isbn_13?.[0] ?? edition.isbn_10?.[0] ?? null,
    languages: editionLanguages(edition),
    coverUrl,
    openLibraryUrl: `https://openlibrary.org/books/${olid}`,
    rawJson: JSON.stringify({ edition, work, editionId: olid, workKey }),
  };
}
