import type { Status } from "./types";

export type LibraryTimestamps = {
  started_at: string | null;
  completed_at: string | null;
};

/** Normaliza puntuación 1–10 o null. Devuelve error si está fuera de rango. */
export function normalizeScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error("La puntuación debe ser un entero entre 1 y 10.");
  }
  return score;
}

/**
 * Aplica reglas de §8: al pasar a in_progress se fija started_at si aún no existe;
 * al pasar a completed se fija completed_at si aún no existe. No se borran al revertir.
 */
export function mergeStatusTimestamps(
  prevStatus: string,
  nextStatus: Status,
  prev: LibraryTimestamps,
  nowIso: string,
): Pick<LibraryTimestamps, "started_at" | "completed_at"> {
  let started_at = prev.started_at;
  let completed_at = prev.completed_at;

  if (nextStatus === "in_progress" && prevStatus !== "in_progress" && started_at === null) {
    started_at = nowIso;
  }

  if (nextStatus === "completed" && prevStatus !== "completed" && completed_at === null) {
    completed_at = nowIso;
  }

  return { started_at, completed_at };
}
