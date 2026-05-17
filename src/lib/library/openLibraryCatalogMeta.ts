export type BookCatalogFields = {
  authors: string[];
  year: number | null;
  overview: string | null;
  isbn: string | null;
  languages: string[];
  openLibraryUrl: string | null;
};

function parseAuthors(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((a): a is string => typeof a === "string" && a.trim().length > 0);
}

function parseManualFormat(o: Record<string, unknown>): BookCatalogFields | null {
  if (!Array.isArray(o.authors)) return null;
  const authors = parseAuthors(o.authors);
  const year = typeof o.year === "number" && o.year > 0 ? Math.trunc(o.year) : null;
  return {
    authors,
    year,
    overview: typeof o.overview === "string" ? o.overview : null,
    isbn: typeof o.isbn === "string" ? o.isbn : null,
    languages: parseAuthors(o.languages),
    openLibraryUrl: typeof o.openLibraryUrl === "string" ? o.openLibraryUrl : null,
  };
}

function yearFromEditionWork(
  edition: Record<string, unknown> | undefined,
  work: Record<string, unknown> | undefined,
  rootYear: unknown,
): number | null {
  if (typeof edition?.publish_year === "number") return Math.trunc(edition.publish_year);
  if (typeof rootYear === "number") return Math.trunc(rootYear);
  return null;
}

function isbnFromEdition(edition: Record<string, unknown> | undefined): string | null {
  if (Array.isArray(edition?.isbn_13) && typeof edition.isbn_13[0] === "string") {
    return edition.isbn_13[0];
  }
  if (Array.isArray(edition?.isbn_10) && typeof edition.isbn_10[0] === "string") {
    return edition.isbn_10[0];
  }
  return null;
}

function parseEditionWorkFormat(o: Record<string, unknown>): BookCatalogFields | null {
  const edition = o.edition as Record<string, unknown> | undefined;
  const work = o.work as Record<string, unknown> | undefined;
  if (!edition && !work) return null;

  const descEd = typeof edition?.description === "string" ? edition.description : null;
  const descWork = typeof work?.description === "string" ? work.description : null;
  const editionId = typeof o.editionId === "string" ? o.editionId : null;

  return {
    authors: parseAuthors(o.authors),
    year: yearFromEditionWork(edition, work, o.year),
    overview: descEd ?? descWork,
    isbn: isbnFromEdition(edition),
    languages: [],
    openLibraryUrl: editionId ? `https://openlibrary.org/books/${editionId}` : null,
  };
}

export function bookCatalogFromMetadata(metadataJson: string | null): BookCatalogFields | null {
  if (!metadataJson?.trim()) return null;
  try {
    const o = JSON.parse(metadataJson) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    if (o.edition != null || o.work != null) {
      return parseEditionWorkFormat(o) ?? parseManualFormat(o);
    }
    return parseManualFormat(o);
  } catch {
    return null;
  }
}

/** Metadatos compactos para catálogo manual de libros. */
export function buildManualBookMetadata(input: {
  authors?: string | null;
  year?: number | null;
}): string | null {
  const authors = input.authors?.trim();
  const year = input.year;
  if (!authors && (year == null || !Number.isFinite(year))) return null;
  const payload: Record<string, unknown> = {};
  if (authors) payload.authors = [authors];
  if (year != null && Number.isFinite(year) && year > 0) payload.year = Math.trunc(year);
  return JSON.stringify(payload);
}
