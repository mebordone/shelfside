/**
 * Valida un `returnTo` de query (ruta interna relativa).
 * Evita open-redirects (`//…`, `https:…`, etc.).
 */
export function safeAppReturnTo(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let path = raw.trim();
  if (!path) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  path = path.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("://")) return null;
  if (path.includes("\\")) return null;
  // Solo rutas de la app que usamos como origen de ficha
  if (
    !(
      path === "/search" ||
      path.startsWith("/search?") ||
      path.startsWith("/search/") ||
      path === "/library" ||
      path.startsWith("/library?") ||
      path.startsWith("/library/")
    )
  ) {
    return null;
  }
  return path;
}

/** Añade `?returnTo=` (o `&`) a un href interno. */
export function withReturnTo(href: string, returnTo: string | null | undefined): string {
  const safe = safeAppReturnTo(returnTo);
  if (!safe) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}returnTo=${encodeURIComponent(safe)}`;
}
