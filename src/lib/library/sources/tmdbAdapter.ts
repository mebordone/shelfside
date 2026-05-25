import { createTmdbClient, getTmdbApiKeyFromEnv, type TmdbSearchHit } from "$lib/api/tmdb/client";
import type { SqlDb, Status } from "$lib/db";
import { addTmdbHitToLibraryFlow, refreshTmdbCatalogFlow } from "$lib/library/tmdbFlow";
import type { AddLibraryResult, CatalogSourceAdapter } from "./types";

export const tmdbCatalogSource: CatalogSourceAdapter = {
  id: "tmdb",

  async addSearchHit(db: SqlDb, hit: TmdbSearchHit, initialStatus?: Status): Promise<AddLibraryResult> {
    const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
    return addTmdbHitToLibraryFlow(db, client, hit, initialStatus);
  },

  async refreshCatalog(db: SqlDb, catalogItemId: number): Promise<void> {
    const client = createTmdbClient({ apiKey: getTmdbApiKeyFromEnv() });
    await refreshTmdbCatalogFlow(db, client, catalogItemId);
  },
};
