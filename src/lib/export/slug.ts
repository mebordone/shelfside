/** Nombre de archivo seguro: slug del título + shelfside_id. */
export function libraryMarkdownFilename(title: string, shelfsideId: number): string {
  let slug = "";
  let prevDash = false;
  for (const ch of title.toLowerCase()) {
    const code = ch.charCodeAt(0);
    const isAlpha = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;
    if (isAlpha || isDigit) {
      slug += ch;
      prevDash = false;
      continue;
    }
    if (!prevDash && slug.length > 0) {
      slug += "-";
      prevDash = true;
    }
  }
  if (slug.endsWith("-")) slug = slug.slice(0, -1);
  const base = slug.slice(0, 60) || "item";
  return `${base}-${shelfsideId}.md`;
}
