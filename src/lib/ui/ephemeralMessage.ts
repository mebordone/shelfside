/**
 * Programa el borrado de un mensaje efímero si sigue siendo el mismo.
 * Pensado para usarse dentro de `$effect` (devolver el cleanup).
 */
export function scheduleEphemeralClear(
  get: () => string | null,
  set: (value: string | null) => void,
  ms = 2500,
): () => void {
  const msg = get();
  if (!msg) return () => {};
  const tid = window.setTimeout(() => {
    if (get() === msg) set(null);
  }, ms);
  return () => window.clearTimeout(tid);
}
