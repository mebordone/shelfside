import { buildOpenLibrarySearchQuery, getOpenLibraryLangParam } from "$lib/i18n/catalogLocale";
import { RELATED_OPEN_LIBRARY_HITS_CAP } from "$lib/library/openLibraryRelatedHits";
import {
  mapSearchDocToRelatedCandidate,
  rankRelatedOpenLibraryHits,
  type RelatedBookCandidate,
  type RelatedCandidateSource,
} from "$lib/library/openLibraryRelatedRank";
import { pickRelatedSubjects } from "$lib/library/openLibraryRelatedSubjects";
import { coverUrlFromCoverId, coverUrlFromEditionOlid } from "./covers";
import {
  buildOpenLibraryDetail,
  fetchAuthorNames,
  resolvePublicationYear,
  resolvePublicationYearFromSearch,
  resolveWorkKeyFromEdition,
  type OlEditionJson,
  type OlWorkJson,
} from "./editionDetail";
import { OpenLibraryHttpError } from "./errors";
import {
  mapSearchDocToHit,
  olidFromKey,
  seriesKeysFromWork,
  type OlSearchDoc,
} from "./parse";
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

const RELATED_SEARCH_FIELDS =
  "key,title,author_name,author_key,first_publish_year,cover_i,editions,subject";
const RELATED_EDITION_FIELDS = "key,title,publish_year,cover_i";

function resolveCoverUrl(editionOlid: string, edition: OlEditionJson, work: OlWorkJson): string | null {
  const coverId = edition.covers?.[0] ?? work.covers?.[0];
  if (typeof coverId === "number" && coverId > 0) return coverUrlFromCoverId(coverId);
  return null;
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
    const rawQ = query.trim();
    const q = buildOpenLibrarySearchQuery(rawQ);
    const pageSize = options?.limit ?? OPEN_LIBRARY_SEARCH_PAGE_SIZE;
    const offset = options?.offset ?? 0;
    const page = Math.floor(offset / pageSize);

    if (!rawQ) {
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
    const coverUrl = resolveCoverUrl(olid, edition, work) ?? options?.coverUrlHint ?? null;

    let yearHint = options?.yearHint;
    if (resolvePublicationYear(work, edition, yearHint) == null) {
      const fromSearch = await resolvePublicationYearFromSearch(olFetch, workKey, olid);
      if (fromSearch != null) yearHint = fromSearch;
    }

    return buildOpenLibraryDetail(olid, edition, work, workKey, authorNames, coverUrl, yearHint);
  }

  async function relatedSearch(
    q: string,
    limit: number,
    source: RelatedCandidateSource,
  ): Promise<RelatedBookCandidate[]> {
    try {
      const params = new URLSearchParams({
        q,
        limit: String(limit),
        lang,
        fields: RELATED_SEARCH_FIELDS,
        "editions.fields": RELATED_EDITION_FIELDS,
      });
      const data = await olFetch<{ docs?: OlSearchDoc[] }>(`/search.json?${params.toString()}`);
      const out: RelatedBookCandidate[] = [];
      for (const doc of data.docs ?? []) {
        const c = mapSearchDocToRelatedCandidate(doc, source);
        if (c) out.push(c);
      }
      return out;
    } catch {
      return [];
    }
  }

  async function getRelatedEditionHits(editionId: string): Promise<OpenLibrarySearchHit[]> {
    const olid = editionId.replace(/^\/books\//, "");
    const edition = await fetchEditionJson(olid);
    const workKey = await resolveWorkKeyFromEdition(olFetch, edition, olid);
    const work = await fetchWorkJson(workKey);
    const workOlid = workKey.replace(/^\/works\//, "");

    const picked = pickRelatedSubjects(work.subjects);
    const seriesKeys = seriesKeysFromWork(work.series);
    const authorKeys = (work.authors ?? [])
      .map((a) => olidFromKey(a.author?.key ?? a.key))
      .filter((k): k is string => Boolean(k));
    const originYear = resolvePublicationYear(work, edition, undefined);

    const parallel: Promise<RelatedBookCandidate[]>[] = [];

    if (seriesKeys[0]) {
      parallel.push(relatedSearch(`series_key:${seriesKeys[0]}`, 8, "series"));
    }
    if (authorKeys[0]) {
      parallel.push(relatedSearch(`author_key:${authorKeys[0]}`, 8, "author"));
    }
    if (picked.pair) {
      parallel.push(
        relatedSearch(
          `subject_key:${picked.pair.genre} AND subject_key:${picked.pair.theme}`,
          12,
          "subject_pair",
        ),
      );
    }

    const primaryLists = await Promise.all(parallel);

    // Fallback de género solo si hay pocos candidatos únicos tras serie/autor/par.
    const uniqueWorks = new Set(
      primaryLists.flat().map((c) => c.workKey).filter((k) => k !== workOlid),
    );
    let genreList: RelatedBookCandidate[] = [];
    if (picked.genre && uniqueWorks.size < 8) {
      genreList = await relatedSearch(`subject_key:${picked.genre}`, 12, "subject");
    }

    return rankRelatedOpenLibraryHits(
      [...primaryLists, genreList],
      {
        year: originYear,
        authorKeys,
        seriesKeys,
        subjectSlugs: picked.slugs,
        primaryGenre: picked.genre,
        excludeEditionId: olid,
        excludeWorkKey: workOlid,
      },
      RELATED_OPEN_LIBRARY_HITS_CAP,
    );
  }

  return {
    searchBooks,
    getEditionDetail,
    getRelatedEditionHits,
    coverUrlFromEditionOlid: (id: string) => coverUrlFromEditionOlid(id.replace(/^\/books\//, "")),
  };
}
