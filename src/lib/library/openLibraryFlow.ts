import type { OpenLibraryClient, OpenLibrarySearchHit } from "$lib/api/openlibrary/client";
import { isReliableOpenLibraryCoverUrl, pickOpenLibraryCoverUrl } from "$lib/api/openlibrary/covers";
import {
  addOpenLibraryToLibrary,
  getCatalogById,
  updateCatalogItem,
  type SqlDb,
  type Status,
} from "$lib/db";
import { downloadPosterToApp, posterRelativePath, removePosterFile } from "$lib/poster";

export function needsOpenLibraryCoverRepair(imageUrl: string | null): boolean {
  return Boolean(imageUrl?.includes("/b/olid/"));
}

function catalogMetadataFromDetail(detail: {
  authors: string[];
  year: number;
  overview: string | null;
  isbn: string | null;
  languages: string[];
  openLibraryUrl: string;
  workKey: string;
  editionId: string;
  rawJson: string;
}): string {
  const raw = JSON.parse(detail.rawJson) as { edition?: unknown; work?: unknown };
  return JSON.stringify({
    authors: detail.authors,
    year: detail.year,
    overview: detail.overview,
    isbn: detail.isbn,
    languages: detail.languages,
    openLibraryUrl: detail.openLibraryUrl,
    workKey: detail.workKey,
    editionId: detail.editionId,
    edition: raw.edition,
    work: raw.work,
  });
}

async function cachePoster(
  db: SqlDb,
  catalogId: number,
  imageUrl: string | null,
  editionId: string,
): Promise<void> {
  if (!imageUrl) return;
  try {
    const rel = posterRelativePath("book", editionId, "jpg");
    await downloadPosterToApp(imageUrl, rel);
    await updateCatalogItem(db, catalogId, { poster_local_path: rel });
  } catch {
    /* conservar image_url remota */
  }
}

export async function addOpenLibraryHitToLibraryFlow(
  db: SqlDb,
  client: OpenLibraryClient,
  hit: OpenLibrarySearchHit,
  initialStatus?: Status,
): Promise<{ catalogId: number; libraryId: number; alreadyInLibrary: boolean }> {
  const detail = await client.getEditionDetail(hit.editionId, {
    yearHint: hit.year,
    coverUrlHint: hit.coverUrl,
  });
  const imageUrl = pickOpenLibraryCoverUrl(hit.coverUrl, detail.coverUrl);

  const r = await addOpenLibraryToLibrary(
    db,
    {
      media_type: "book",
      source: "openlibrary",
      external_id: detail.editionId,
      title: detail.title,
      image_url: imageUrl,
      metadata_json: catalogMetadataFromDetail(detail),
    },
    initialStatus != null ? { initial_status: initialStatus } : undefined,
  );

  if (!r.alreadyInLibrary) {
    await cachePoster(db, r.catalogId, imageUrl, detail.editionId);
  }

  return r;
}

export async function refreshOpenLibraryCatalogFlow(
  db: SqlDb,
  client: OpenLibraryClient,
  catalogItemId: number,
): Promise<void> {
  const cat = await getCatalogById(db, catalogItemId);
  if (!cat) throw new Error("Ítem de catálogo no encontrado.");
  if (cat.source !== "openlibrary") {
    throw new Error("Solo se puede refrescar desde Open Library si la fuente es openlibrary.");
  }

  const coverUrlHint = pickOpenLibraryCoverUrl(cat.image_url);
  const detail = await client.getEditionDetail(cat.external_id, { coverUrlHint });
  const imageUrl = pickOpenLibraryCoverUrl(detail.coverUrl, coverUrlHint);

  await updateCatalogItem(db, catalogItemId, {
    title: detail.title,
    image_url: imageUrl,
    metadata_json: catalogMetadataFromDetail(detail),
  });

  await cachePoster(db, catalogItemId, imageUrl, detail.editionId);
}

/** Limpia URL/poster OLID inválidos y vuelve a refrescar desde Open Library. */
export async function repairOpenLibraryCoverFlow(
  db: SqlDb,
  client: OpenLibraryClient,
  catalogItemId: number,
): Promise<void> {
  const cat = await getCatalogById(db, catalogItemId);
  if (!cat) throw new Error("Ítem de catálogo no encontrado.");
  if (cat.source !== "openlibrary") {
    throw new Error("Solo se puede reparar portada Open Library para libros de openlibrary.");
  }

  if (cat.poster_local_path) {
    await removePosterFile(cat.poster_local_path);
    await updateCatalogItem(db, catalogItemId, { poster_local_path: null });
  }
  if (needsOpenLibraryCoverRepair(cat.image_url) || !isReliableOpenLibraryCoverUrl(cat.image_url)) {
    await updateCatalogItem(db, catalogItemId, { image_url: null });
  }

  await refreshOpenLibraryCatalogFlow(db, client, catalogItemId);
}
