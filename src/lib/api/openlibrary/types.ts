export type OpenLibraryClientOptions = {
  lang?: string;
  fetchImpl?: typeof fetch;
};

export type GetEditionDetailOptions = {
  /** Año ya mostrado en búsqueda (p. ej. first_publish_year del listado). */
  yearHint?: number;
  /** Portada del listado de búsqueda si el JSON de edición no trae `covers`. */
  coverUrlHint?: string | null;
};

/** Resultados por página en búsqueda (10 ítems; una petición por página nueva). */
export const OPEN_LIBRARY_SEARCH_PAGE_SIZE = 10;

export type SearchBooksOptions = {
  offset?: number;
  limit?: number;
};

export type OpenLibrarySearchPage = {
  hits: OpenLibrarySearchHit[];
  /** Total de obras que reporta Open Library (`num_found`). */
  numFound: number;
  page: number;
  pageSize: number;
};

export type OpenLibraryClient = {
  searchBooks: (query: string, options?: SearchBooksOptions) => Promise<OpenLibrarySearchPage>;
  getEditionDetail: (editionId: string, options?: GetEditionDetailOptions) => Promise<OpenLibraryDetail>;
  getRelatedEditionHits: (editionId: string) => Promise<OpenLibrarySearchHit[]>;
  coverUrlFromEditionOlid: (id: string) => string;
};

export type OpenLibrarySearchHit = {
  editionId: string;
  workKey: string;
  title: string;
  /** Título de la obra si difiere del mostrado (p. ej. edición local vs. canónico en inglés). */
  workTitle?: string;
  authors: string[];
  year: number;
  coverUrl: string | null;
};

export type OpenLibraryDetail = {
  editionId: string;
  workKey: string;
  title: string;
  authors: string[];
  year: number;
  overview: string | null;
  isbn: string | null;
  languages: string[];
  coverUrl: string | null;
  openLibraryUrl: string;
  rawJson: string;
};
