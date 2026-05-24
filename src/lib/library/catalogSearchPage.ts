import { createOpenLibraryClient, createTmdbClient } from "$lib/api";
import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import type { TmdbClient, TmdbSearchHit } from "$lib/api/tmdb/client";
import { resolvePosterDisplayUrl } from "$lib/poster";
import type {
  OpenLibrarySearchHitRow,
  SearchHitRow,
  SearchSource,
  TmdbSearchHitRow,
} from "$lib/stores/searchSession.svelte";
import { getPageSizeForSource } from "./searchPagination";

export type SearchPageMeta = {
  total: number;
  totalPages: number;
  pageSize: number;
};

export type FetchSearchPageResult = {
  rows: SearchHitRow[];
  meta: SearchPageMeta;
};

export async function mapTmdbHits(
  client: TmdbClient,
  raw: TmdbSearchHit[],
): Promise<TmdbSearchHitRow[]> {
  return Promise.all(
    raw.map(async (h) => ({
      kind: "tmdb" as const,
      ...h,
      thumb: await resolvePosterDisplayUrl(null, client.posterUrlFromPath(h.posterPath)),
    })),
  );
}

export async function mapOlHits(raw: OpenLibrarySearchHit[]): Promise<OpenLibrarySearchHitRow[]> {
  return Promise.all(
    raw.map(async (h) => ({
      kind: "openlibrary" as const,
      ...h,
      thumb: await resolvePosterDisplayUrl(null, h.coverUrl),
    })),
  );
}

export async function fetchTmdbSearchPage(
  query: string,
  page: number,
  apiKey: string,
): Promise<FetchSearchPageResult> {
  const client = createTmdbClient({ apiKey });
  const result = await client.searchMulti(query, { page });
  const rows = await mapTmdbHits(client, result.hits);
  return {
    rows,
    meta: {
      total: result.totalResults,
      totalPages: result.totalPages,
      pageSize: result.pageSize,
    },
  };
}

export async function fetchOlSearchPage(query: string, page: number): Promise<FetchSearchPageResult> {
  const client = createOpenLibraryClient();
  const pageSize = getPageSizeForSource("openlibrary");
  const result = await client.searchBooks(query, {
    offset: page * pageSize,
    limit: pageSize,
  });
  const rows = await mapOlHits(result.hits);
  return {
    rows,
    meta: {
      total: result.numFound,
      totalPages: 0,
      pageSize: result.pageSize,
    },
  };
}

export async function fetchSearchPage(
  source: SearchSource,
  query: string,
  page: number,
  apiKey: string,
): Promise<FetchSearchPageResult> {
  if (source === "tmdb") return fetchTmdbSearchPage(query, page, apiKey);
  return fetchOlSearchPage(query, page);
}

export function applyPageFromCache<T>(
  pageCache: Record<number, T[]>,
  page: number,
): T[] | null {
  const cached = pageCache[page];
  return cached ?? null;
}

export function commitSearchPage<T>(
  pageCache: Record<number, T[]>,
  page: number,
  rows: T[],
): Record<number, T[]> {
  return { ...pageCache, [page]: rows };
}
