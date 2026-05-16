import type { TmdbClient, TmdbSearchHit } from "$lib/api/tmdb/client";
import {
  addTmdbToLibrary,
  getCatalogById,
  updateCatalogItem,
  type SqlDb,
} from "$lib/db";
import { downloadPosterToApp, posterRelativePath } from "$lib/poster";

export async function addTmdbHitToLibraryFlow(
  db: SqlDb,
  client: TmdbClient,
  hit: TmdbSearchHit,
): Promise<{ catalogId: number; libraryId: number; alreadyInLibrary: boolean }> {
  const detail = hit.mediaType === "movie" ? await client.getMovieDetail(hit.id) : await client.getTvDetail(hit.id);
  const imageUrl = client.posterUrlFromPath(detail.posterPath);

  const r = await addTmdbToLibrary(db, {
    media_type: detail.mediaType,
    source: "tmdb",
    external_id: String(detail.id),
    title: detail.title,
    image_url: imageUrl,
    metadata_json: detail.rawJson,
  });

  if (!r.alreadyInLibrary && imageUrl) {
    try {
      const rel = posterRelativePath(detail.mediaType, detail.id, "jpg");
      await downloadPosterToApp(imageUrl, rel);
      await updateCatalogItem(db, r.catalogId, { poster_local_path: rel });
    } catch {
      /* catálogo conserva image_url remota */
    }
  }

  return r;
}

export async function refreshTmdbCatalogFlow(db: SqlDb, client: TmdbClient, catalogItemId: number): Promise<void> {
  const cat = await getCatalogById(db, catalogItemId);
  if (!cat) throw new Error("Ítem de catálogo no encontrado.");
  if (cat.source !== "tmdb") {
    throw new Error("Solo se puede refrescar desde TMDB si la fuente es TMDB.");
  }

  const id = Number(cat.external_id);
  if (!Number.isFinite(id)) {
    throw new Error("ID externo inválido.");
  }

  const detail =
    cat.media_type === "movie" ? await client.getMovieDetail(id) : await client.getTvDetail(id);
  const imageUrl = client.posterUrlFromPath(detail.posterPath);

  await updateCatalogItem(db, catalogItemId, {
    title: detail.title,
    image_url: imageUrl,
    metadata_json: detail.rawJson,
  });

  if (imageUrl) {
    try {
      const rel = posterRelativePath(detail.mediaType, detail.id, "jpg");
      await downloadPosterToApp(imageUrl, rel);
      await updateCatalogItem(db, catalogItemId, { poster_local_path: rel });
    } catch {
      /* mantener URL remota */
    }
  }
}
