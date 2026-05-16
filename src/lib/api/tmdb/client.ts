import { TmdbConfigError, TmdbHttpError } from "./errors";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_W500 = "https://image.tmdb.org/t/p/w500";

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
    async searchMulti(query: string): Promise<TmdbSearchHit[]> {
      const q = query.trim();
      if (!q) return [];
      const data = await request<{ results?: TmdbMultiRow[] }>(
        `/search/multi?query=${encodeURIComponent(q)}`,
      );
      const hits: TmdbSearchHit[] = [];
      for (const r of data.results ?? []) {
        const hit = hitFromMultiRow(r);
        if (hit) hits.push(hit);
      }
      return hits;
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

    posterUrlFromPath,
  };
}

export function getTmdbApiKeyFromEnv(): string {
  return import.meta.env.VITE_TMDB_API_KEY ?? "";
}
