const COVERS_BASE = "https://covers.openlibrary.org";

/** Portada por OLID de edición (tamaño L, fallback M en caller si falla HTTP). */
export function coverUrlFromEditionOlid(editionOlid: string, size: "L" | "M" = "L"): string {
  const id = editionOlid.replace(/^\/books\//, "").replace(/^\//, "");
  return `${COVERS_BASE}/b/olid/${id}-${size}.jpg`;
}

export function coverUrlFromCoverId(coverId: number, size: "L" | "M" = "L"): string {
  return `${COVERS_BASE}/b/id/${coverId}-${size}.jpg`;
}

/** URLs `/b/olid/` suelen devolver 404; solo `/b/id/` es fiable para guardar y mostrar. */
export function isReliableOpenLibraryCoverUrl(url: string | null | undefined): url is string {
  return Boolean(url?.includes("/b/id/"));
}

export function pickOpenLibraryCoverUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const url of candidates) {
    if (isReliableOpenLibraryCoverUrl(url)) return url;
  }
  return null;
}
