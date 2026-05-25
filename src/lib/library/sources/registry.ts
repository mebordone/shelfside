import type { OpenLibrarySearchHit } from "$lib/api/openlibrary/types";
import type { TmdbSearchHit } from "$lib/api/tmdb/client";
import type { SqlDb, Status } from "$lib/db";
import type { SearchHitRow } from "$lib/stores/searchSession.svelte";
import { openLibraryCatalogSource } from "./openlibraryAdapter";
import { tmdbCatalogSource } from "./tmdbAdapter";
import type { AddLibraryResult, CatalogSourceAdapter, CatalogSourceId } from "./types";

const adapters: Record<CatalogSourceId, CatalogSourceAdapter> = {
  tmdb: tmdbCatalogSource,
  openlibrary: openLibraryCatalogSource,
};

export function getCatalogSourceAdapter(source: string): CatalogSourceAdapter {
  const adapter = adapters[source as CatalogSourceId];
  if (!adapter) {
    throw new Error(`Fuente de catálogo no soportada: ${source}`);
  }
  return adapter;
}

export function isCatalogSourceId(source: string): source is CatalogSourceId {
  return source === "tmdb" || source === "openlibrary";
}

export async function addSearchHitToLibrary(
  db: SqlDb,
  hit: SearchHitRow,
  initialStatus?: Status,
): Promise<AddLibraryResult> {
  const adapter = getCatalogSourceAdapter(hit.kind);
  if (hit.kind === "tmdb") {
    return adapter.addSearchHit(db, hit as TmdbSearchHit, initialStatus);
  }
  return adapter.addSearchHit(db, hit as OpenLibrarySearchHit, initialStatus);
}

export async function refreshCatalogItem(
  db: SqlDb,
  source: string,
  catalogItemId: number,
): Promise<void> {
  return getCatalogSourceAdapter(source).refreshCatalog(db, catalogItemId);
}

export async function addTmdbSearchHitToLibrary(
  db: SqlDb,
  hit: TmdbSearchHit,
  initialStatus?: Status,
): Promise<AddLibraryResult> {
  return tmdbCatalogSource.addSearchHit(db, hit, initialStatus);
}

export async function addOpenLibrarySearchHitToLibrary(
  db: SqlDb,
  hit: OpenLibrarySearchHit,
  initialStatus?: Status,
): Promise<AddLibraryResult> {
  return openLibraryCatalogSource.addSearchHit(db, hit, initialStatus);
}
