import { getOpenLibraryLangParam } from "$lib/i18n/locale";
import { coverUrlFromCoverId, coverUrlFromEditionOlid } from "./covers";
import {
  buildOpenLibraryDetail,
  fetchAuthorNames,
  resolveWorkKeyFromEdition,
  type OlEditionJson,
  type OlWorkJson,
} from "./editionDetail";
import { OpenLibraryHttpError } from "./errors";
import { mapSearchDocToHit, olidFromKey, type OlSearchDoc } from "./parse";
import {
  resolvePublicationYear,
  resolvePublicationYearFromSearch,
} from "./editionDetail";
import type {
  GetEditionDetailOptions,
  OpenLibraryClient,
  OpenLibraryClientOptions,
  OpenLibraryDetail,
  OpenLibrarySearchHit,
  OpenLibrarySearchPage,
  SearchBooksOptions,
} from "./types";
import { OPEN_LIBRARY_SEARCH_PAGE_SIZE } from "./types";

export type {
  GetEditionDetailOptions,
  OpenLibraryClient,
  OpenLibraryClientOptions,
  OpenLibraryDetail,
  OpenLibrarySearchHit,
  OpenLibrarySearchPage,
  SearchBooksOptions,
  OPEN_LIBRARY_SEARCH_PAGE_SIZE,
} from "./types";

const OL_BASE = "https://openlibrary.org";
const RELATED_PER_SUBJECT = 8;
const RELATED_SUBJECTS_MAX = 2;

function subjectToSlug(subject: string): string {
  return subject
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveCoverUrl(editionOlid: string, edition: OlEditionJson, work: OlWorkJson): string | null {
  const coverId = edition.covers?.[0] ?? work.covers?.[0];
  if (typeof coverId === "number" && coverId > 0) return coverUrlFromCoverId(coverId);
  return coverUrlFromEditionOlid(editionOlid);
}

export function createOpenLibraryClient(options: OpenLibraryClientOptions = {}): OpenLibraryClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const lang = options.lang ?? getOpenLibraryLangParam();

  async function olFetch<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${OL_BASE}${path}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new OpenLibraryHttpError(`Open Library: HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  }

  async function searchBooks(query: string, options?: SearchBooksOptions): Promise<OpenLibrarySearchPage> {
    const q = query.trim();
    const pageSize = options?.limit ?? OPEN_LIBRARY_SEARCH_PAGE_SIZE;
    const offset = options?.offset ?? 0;
    const page = Math.floor(offset / pageSize);

    if (!q) {
      return { hits: [], numFound: 0, page: 0, pageSize };
    }

    const fields = "key,title,author_name,first_publish_year,cover_i,editions";
    const editionFields = "key,title,publish_year,language,isbn,cover_i";
    const params = new URLSearchParams({
      q,
      limit: String(pageSize),
      offset: String(offset),
      lang,
      fields,
      "editions.fields": editionFields,
    });

    const data = await olFetch<{ docs?: OlSearchDoc[]; numFound?: number }>(
      `/search.json?${params.toString()}`,
    );
    const hits: OpenLibrarySearchHit[] = [];
    for (const doc of data.docs ?? []) {
      const hit = mapSearchDocToHit(doc);
      if (hit) hits.push(hit);
    }
    const numFound = typeof data.numFound === "number" ? data.numFound : hits.length;
    return { hits, numFound, page, pageSize };
  }

  async function fetchEditionJson(editionId: string): Promise<OlEditionJson> {
    const olid = editionId.replace(/^\/books\//, "");
    return olFetch<OlEditionJson>(`/books/${olid}.json`);
  }

  async function fetchWorkJson(workKey: string): Promise<OlWorkJson> {
    const olid = workKey.replace(/^\/works\//, "");
    return olFetch<OlWorkJson>(`/works/${olid}.json`);
  }

  async function getEditionDetail(
    editionId: string,
    options?: GetEditionDetailOptions,
  ): Promise<OpenLibraryDetail> {
    const olid = editionId.replace(/^\/books\//, "");
    const edition = await fetchEditionJson(olid);
    const workKey = await resolveWorkKeyFromEdition(olFetch, edition, olid);
    const work = await fetchWorkJson(workKey);
    const authorNames = await fetchAuthorNames(olFetch, work);
    const coverUrl = resolveCoverUrl(olid, edition, work);

    let yearHint = options?.yearHint;
    if (resolvePublicationYear(work, edition, yearHint) == null) {
      const fromSearch = await resolvePublicationYearFromSearch(olFetch, workKey, olid);
      if (fromSearch != null) yearHint = fromSearch;
    }

    return buildOpenLibraryDetail(olid, edition, work, workKey, authorNames, coverUrl, yearHint);
  }

  async function editionHitFromWorkOlid(workOlid: string, excludeEditionId: string | null): Promise<OpenLibrarySearchHit | null> {
    const params = new URLSearchParams({
      q: `key:/works/${workOlid}`,
      limit: "1",
      lang,
      fields: "key,title,author_name,first_publish_year,cover_i,editions",
      "editions.fields": "key,title,publish_year,cover_i",
    });
    const data = await olFetch<{ docs?: OlSearchDoc[] }>(`/search.json?${params.toString()}`);
    const hit = mapSearchDocToHit(data.docs?.[0] ?? {});
    if (!hit || hit.editionId === excludeEditionId) return null;
    return hit;
  }

  async function hitsFromSubject(subject: string, excludeEditionId: string | null): Promise<OpenLibrarySearchHit[]> {
    const slug = subjectToSlug(subject);
    if (!slug) return [];
    try {
      const data = await olFetch<{ works?: { key?: string }[] }>(
        `/subjects/${encodeURIComponent(slug)}.json?limit=${RELATED_PER_SUBJECT}`,
      );
      const hits: OpenLibrarySearchHit[] = [];
      for (const w of data.works ?? []) {
        const workOlid = olidFromKey(w.key);
        if (!workOlid) continue;
        const hit = await editionHitFromWorkOlid(workOlid, excludeEditionId);
        if (hit) hits.push(hit);
        if (hits.length >= RELATED_PER_SUBJECT) break;
      }
      return hits;
    } catch {
      return [];
    }
  }

  async function hitsFromAuthorKeys(authorKeys: string[], excludeEditionId: string | null): Promise<OpenLibrarySearchHit[]> {
    const hits: OpenLibrarySearchHit[] = [];
    const ak = authorKeys[0];
    if (!ak) return hits;
    const authorOlid = olidFromKey(ak);
    if (!authorOlid) return hits;
    try {
      const data = await olFetch<{ docs?: OlSearchDoc[] }>(
        `/search.json?q=author_key:${authorOlid}&limit=${RELATED_PER_SUBJECT}&lang=${lang}&fields=key,title,author_name,first_publish_year,cover_i,editions&editions.fields=key,title,publish_year,cover_i`,
      );
      for (const doc of data.docs ?? []) {
        const hit = mapSearchDocToHit(doc);
        if (hit && hit.editionId !== excludeEditionId) hits.push(hit);
        if (hits.length >= RELATED_PER_SUBJECT) break;
      }
    } catch {
      /* omitir */
    }
    return hits;
  }

  async function getRelatedEditionHits(editionId: string): Promise<OpenLibrarySearchHit[]> {
    const olid = editionId.replace(/^\/books\//, "");
    const edition = await fetchEditionJson(olid);
    const workKey = await resolveWorkKeyFromEdition(olFetch, edition, olid);
    const work = await fetchWorkJson(workKey);

    const lists: OpenLibrarySearchHit[][] = [];
    const subjects = (work.subjects ?? []).filter((s) => s.trim().length > 2).slice(0, RELATED_SUBJECTS_MAX);
    for (const subj of subjects) {
      lists.push(await hitsFromSubject(subj, olid));
    }

    if (lists.every((l) => l.length === 0)) {
      const authorKeys = (work.authors ?? [])
        .map((a) => a.author?.key ?? a.key)
        .filter((k): k is string => Boolean(k));
      lists.push(await hitsFromAuthorKeys(authorKeys, olid));
    }

    return lists.flat();
  }

  return {
    searchBooks,
    getEditionDetail,
    getRelatedEditionHits,
    coverUrlFromEditionOlid: (id: string) => coverUrlFromEditionOlid(id.replace(/^\/books\//, "")),
  };
}
