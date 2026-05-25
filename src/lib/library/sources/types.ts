import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import type { TmdbSearchHit } from "$lib/api/tmdb/client";
import type { SqlDb, Status } from "$lib/db";

export type CatalogSourceId = "tmdb" | "openlibrary";

export type AddLibraryResult = {
  catalogId: number;
  libraryId: number;
  alreadyInLibrary: boolean;
};

export type CatalogSearchHit = TmdbSearchHit | OpenLibrarySearchHit;

export interface CatalogSourceAdapter {
  readonly id: CatalogSourceId;
  addSearchHit(
    db: SqlDb,
    hit: CatalogSearchHit,
    initialStatus?: Status,
  ): Promise<AddLibraryResult>;
  refreshCatalog(db: SqlDb, catalogItemId: number): Promise<void>;
}
