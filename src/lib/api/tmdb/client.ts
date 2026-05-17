import { TmdbConfigError, TmdbHttpError } from "./errors";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_W500 = "https://image.tmdb.org/t/p/w500";

/** Resultados por página en búsqueda multi (fijo en la API TMDB). */
export const TMDB_SEARCH_PAGE_SIZE = 20;

export type SearchMultiOptions = {
  /** Página 0-based en la app (se envía como page+1 a TMDB). */
  page?: number;
};

export type TmdbSearchPage = {
  hits: TmdbSearchHit[];
  totalResults: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type TmdbSearchHit = {
  mediaType: "movie" | "tv";
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  yearLabel: string | null;
};

export type TmdbDetail = {
  mediaType: "movie" | "tv";
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  rawJson: string;
};

export type TmdbClientOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type TmdbClient = ReturnType<typeof createTmdbClient>;

function posterUrlFromPath(path: string | null): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_W500}${path}`;
}

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get("retry-after");
  if (!h) return undefined;
  const n = Number.parseInt(h, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Token de lectura JWT de TMDB vs clave API v3 (hex). */
function tmdbAuthIsBearerToken(key: string): boolean {
  const k = key.trim();
  return k.startsWith("eyJ") && k.includes(".");
}

type TmdbMultiRow = {
  media_type?: string;
  id?: number;
  title?: string;
  name?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
};

function yearFromTmdbDate(date: string | null | undefined): string | null {
  return date && date.length >= 4 ? date.slice(0, 4) : null;
}

function titleFromMultiRow(r: TmdbMultiRow): string {
  const raw = r.media_type === "movie" ? (r.title ?? "") : (r.name ?? "");
  return raw || "(sin título)";
}

function hitFromMultiRow(r: TmdbMultiRow): TmdbSearchHit | null {
  if (r.media_type !== "movie" && r.media_type !== "tv") return null;
  if (typeof r.id !== "number") return null;
  const date = r.media_type === "movie" ? r.release_date : r.first_air_date;
  return {
    mediaType: r.media_type,
    id: r.id,
    title: titleFromMultiRow(r),
    overview: r.overview ?? null,
    posterPath: r.poster_path ?? null,
    yearLabel: yearFromTmdbDate(date),
  };
}

/** Fila de lista TMDB para /movie/{id}/recommendations y /similar (sin media_type). */
type TmdbMovieListRow = {
  id?: number;
  title?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
};

/** Fila de lista TMDB para /tv/{id}/recommendations y /similar (sin media_type). */
type TmdbTvListRow = {
  id?: number;
  name?: string;
  overview?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
};

function hitFromMovieListRow(r: TmdbMovieListRow): TmdbSearchHit | null {
  if (typeof r.id !== "number") return null;
  const title = (r.title ?? "").trim() || "(sin título)";
  return {
    mediaType: "movie",
    id: r.id,
    title,
    overview: r.overview ?? null,
    posterPath: r.poster_path ?? null,
    yearLabel: yearFromTmdbDate(r.release_date),
  };
}

function hitFromTvListRow(r: TmdbTvListRow): TmdbSearchHit | null {
  if (typeof r.id !== "number") return null;
  const title = (r.name ?? "").trim() || "(sin título)";
  return {
    mediaType: "tv",
    id: r.id,
    title,
    overview: r.overview ?? null,
    posterPath: r.poster_path ?? null,
    yearLabel: yearFromTmdbDate(r.first_air_date),
  };
}

function hitsFromMovieResults(results: TmdbMovieListRow[] | undefined): TmdbSearchHit[] {
  const hits: TmdbSearchHit[] = [];
  for (const r of results ?? []) {
    const h = hitFromMovieListRow(r);
    if (h) hits.push(h);
  }
  return hits;
}

function hitsFromTvResults(results: TmdbTvListRow[] | undefined): TmdbSearchHit[] {
  const hits: TmdbSearchHit[] = [];
  for (const r of results ?? []) {
    const h = hitFromTvListRow(r);
    if (h) hits.push(h);
  }
  return hits;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TmdbHttpError("Respuesta TMDB no es JSON válido.", res.status);
  }
}

function tmdbRequestUrl(pathWithQuery: string, apiKey: string, bearer: boolean): string {
  if (bearer) return `${TMDB_BASE}${pathWithQuery}`;
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  return `${TMDB_BASE}${pathWithQuery}${sep}api_key=${encodeURIComponent(apiKey)}`;
}

function tmdbRequestInit(apiKey: string, bearer: boolean): RequestInit {
  if (bearer) return { headers: { Authorization: `Bearer ${apiKey}` } };
  return {};
}

export function createTmdbClient(opts: TmdbClientOptions) {
  const key = opts.apiKey.trim();
  if (!key) {
    throw new TmdbConfigError("Falta VITE_TMDB_API_KEY en el entorno.");
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const useBearer = tmdbAuthIsBearerToken(key);

  async function request<T>(pathWithQuery: string, attempt = 0): Promise<T> {
    const url = tmdbRequestUrl(pathWithQuery, key, useBearer);
    const init = tmdbRequestInit(key, useBearer);
    let res: Response;
    try {
      res = await fetchImpl(url, init);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TmdbHttpError(`Error de red TMDB: ${msg}`, 0);
    }

    if (res.status === 429 && attempt < 1) {
      const wait = (parseRetryAfter(res) ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      return request<T>(pathWithQuery, attempt + 1);
    }

    if (res.status === 401) {
      throw new TmdbHttpError("TMDB rechazó la clave API (401).", 401);
    }

    if (!res.ok) {
      throw new TmdbHttpError(`TMDB respondió ${res.status}.`, res.status, parseRetryAfter(res));
    }

    return readJson<T>(res);
  }

  return {
    async searchMulti(query: string, options?: SearchMultiOptions): Promise<TmdbSearchPage> {
      const q = query.trim();
      const page0 = options?.page ?? 0;
      const pageSize = TMDB_SEARCH_PAGE_SIZE;

      if (!q) {
        return { hits: [], totalResults: 0, totalPages: 0, page: 0, pageSize };
      }

      const page1 = page0 + 1;
      const data = await request<{
        results?: TmdbMultiRow[];
        total_results?: number;
        total_pages?: number;
      }>(`/search/multi?query=${encodeURIComponent(q)}&page=${String(page1)}`);

      const hits: TmdbSearchHit[] = [];
      for (const r of data.results ?? []) {
        const hit = hitFromMultiRow(r);
        if (hit) hits.push(hit);
      }

      const totalResults = typeof data.total_results === "number" ? data.total_results : hits.length;
      const totalPages = typeof data.total_pages === "number" ? data.total_pages : 1;

      return { hits, totalResults, totalPages, page: page0, pageSize };
    },

    async getMovieDetail(id: number): Promise<TmdbDetail> {
      const m = await request<{
        id: number;
        title?: string;
        overview?: string | null;
        poster_path?: string | null;
      }>(`/movie/${id}`);

      return {
        mediaType: "movie",
        id: m.id,
        title: m.title ?? "(sin título)",
        overview: m.overview ?? null,
        posterPath: m.poster_path ?? null,
        rawJson: JSON.stringify(m),
      };
    },

    async getTvDetail(id: number): Promise<TmdbDetail> {
      const m = await request<{
        id: number;
        name?: string;
        overview?: string | null;
        poster_path?: string | null;
      }>(`/tv/${id}`);

      return {
        mediaType: "tv",
        id: m.id,
        title: m.name ?? "(sin título)",
        overview: m.overview ?? null,
        posterPath: m.poster_path ?? null,
        rawJson: JSON.stringify(m),
      };
    },

    async getMovieRecommendations(id: number): Promise<TmdbSearchHit[]> {
      const data = await request<{ results?: TmdbMovieListRow[] }>(`/movie/${id}/recommendations`);
      return hitsFromMovieResults(data.results);
    },

    async getMovieSimilar(id: number): Promise<TmdbSearchHit[]> {
      const data = await request<{ results?: TmdbMovieListRow[] }>(`/movie/${id}/similar`);
      return hitsFromMovieResults(data.results);
    },

    async getTvRecommendations(id: number): Promise<TmdbSearchHit[]> {
      const data = await request<{ results?: TmdbTvListRow[] }>(`/tv/${id}/recommendations`);
      return hitsFromTvResults(data.results);
    },

    async getTvSimilar(id: number): Promise<TmdbSearchHit[]> {
      const data = await request<{ results?: TmdbTvListRow[] }>(`/tv/${id}/similar`);
      return hitsFromTvResults(data.results);
    },

    posterUrlFromPath,
  };
}

export function getTmdbApiKeyFromEnv(): string {
  return import.meta.env.VITE_TMDB_API_KEY ?? "";
}
