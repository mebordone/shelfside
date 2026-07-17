/** Entero ≥ 0, o null si el campo está vacío. `undefined` si el texto no es un entero válido. */
export function parseNonNegativeIntOrNull(v: string | number): number | null | undefined {
  const trimmed = String(v ?? "").trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function isValidNonNegativeIntInput(v: string | number): boolean {
  return parseNonNegativeIntOrNull(v) !== undefined;
}

export function nextEpisode(current: number | null | undefined): number {
  return (current ?? 0) + 1;
}
