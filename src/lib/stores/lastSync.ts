const STORAGE_KEY = "shelfside-last-sync";

export type LastSync = {
  at: number;
  kind: "ok" | "err";
  summary: string;
};

export function readLastSync(): LastSync | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastSync>;
    if (
      typeof parsed?.at === "number" &&
      (parsed.kind === "ok" || parsed.kind === "err") &&
      typeof parsed.summary === "string"
    ) {
      return { at: parsed.at, kind: parsed.kind, summary: parsed.summary };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function persistLastSync(value: LastSync): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Etiqueta relativa simple (es): "hace X min/h/d" o "recién". */
export function formatRelativeTime(at: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - at);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}
