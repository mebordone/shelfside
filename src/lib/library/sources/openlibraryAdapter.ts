import { createOpenLibraryClient } from "$lib/api/openlibrary/client";
import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import type { SqlDb, Status } from "$lib/db";
import {
  addOpenLibraryHitToLibraryFlow,
  refreshOpenLibraryCatalogFlow,
} from "$lib/library/openLibraryFlow";
import type { AddLibraryResult, CatalogSourceAdapter } from "./types";

export const openLibraryCatalogSource: CatalogSourceAdapter = {
  id: "openlibrary",

  async addSearchHit(
    db: SqlDb,
    hit: OpenLibrarySearchHit,
    initialStatus?: Status,
  ): Promise<AddLibraryResult> {
    const client = createOpenLibraryClient();
    return addOpenLibraryHitToLibraryFlow(db, client, hit, initialStatus);
  },

  async refreshCatalog(db: SqlDb, catalogItemId: number): Promise<void> {
    const client = createOpenLibraryClient();
    await refreshOpenLibraryCatalogFlow(db, client, catalogItemId);
  },
};
