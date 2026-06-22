import { findCatalogBySource, type SqlDb } from "$lib/db/catalog";
import { getLibraryEntryById, getLibraryIdForCatalog } from "$lib/db/library";
import type { ParsedMarkdownEntry } from "./parseMarkdown";

/** Entrada local por shelfside_id del .md o por (source, external_id, media_type). */
export async function resolveLocalEntry(
  db: SqlDb,
  remote: ParsedMarkdownEntry,
): Promise<Awaited<ReturnType<typeof getLibraryEntryById>>> {
  const byId = await getLibraryEntryById(db, remote.shelfside_id);
  if (byId) return byId;

  const catalog = await findCatalogBySource(db, remote.source, remote.external_id, remote.media_type);
  if (!catalog) return null;

  const libraryId = await getLibraryIdForCatalog(db, catalog.id);
  if (libraryId === null) return null;

  return getLibraryEntryById(db, libraryId);
}
