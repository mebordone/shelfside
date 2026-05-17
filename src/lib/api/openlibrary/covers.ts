const COVERS_BASE = "https://covers.openlibrary.org";

/** Portada por OLID de edición (tamaño L, fallback M en caller si falla HTTP). */
export function coverUrlFromEditionOlid(editionOlid: string, size: "L" | "M" = "L"): string {
  const id = editionOlid.replace(/^\/books\//, "").replace(/^\//, "");
  return `${COVERS_BASE}/b/olid/${id}-${size}.jpg`;
}

export function coverUrlFromCoverId(coverId: number, size: "L" | "M" = "L"): string {
  return `${COVERS_BASE}/b/id/${coverId}-${size}.jpg`;
}
