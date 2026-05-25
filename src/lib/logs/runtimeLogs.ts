type LogLevel = "INFO" | "WARN" | "ERROR";

interface RuntimeLogEntry {
  ts: string;
  level: LogLevel;
  event: string;
  detail?: string;
}

const STORAGE_KEY = "shelfside.runtime.logs.v1";
const MAX_ENTRIES = 400;

let initialized = false;
let entries: RuntimeLogEntry[] = [];

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function toErrorPayload(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\n${err.stack ?? "(no stack)"}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function toDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined;
  if (typeof detail === "string") return detail;
  if (detail instanceof Error) return toErrorPayload(detail);
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function persistLogs() {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignorar errores de storage (cuota, contexto privado, etc.).
  }
}

function loadLogs() {
  if (!hasWindow()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    entries = parsed.filter((x): x is RuntimeLogEntry => {
      return (
        x &&
        typeof x === "object" &&
        typeof x.ts === "string" &&
        typeof x.level === "string" &&
        typeof x.event === "string"
      );
    });
  } catch {
    // Ignorar logs corruptos.
  }
}

function push(level: LogLevel, event: string, detail?: unknown) {
  entries.push({
    ts: new Date().toISOString(),
    level,
    event,
    detail: toDetail(detail),
  });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  persistLogs();
}

export function logInfo(event: string, detail?: unknown) {
  push("INFO", event, detail);
}

export function logWarn(event: string, detail?: unknown) {
  push("WARN", event, detail);
}

export function logError(event: string, detail?: unknown) {
  push("ERROR", event, detail);
}

export function initRuntimeLogs() {
  if (!hasWindow() || initialized) return;
  initialized = true;
  loadLogs();

  logInfo("runtime.init", {
    userAgent: navigator.userAgent,
    language: navigator.language,
    url: window.location.href,
  });

  window.addEventListener("error", (ev) => {
    logError("window.error", {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      error: toErrorPayload(ev.error),
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    logError("window.unhandledrejection", {
      reason: toErrorPayload(ev.reason),
    });
  });
}

export function getRuntimeLogsText(): string {
  const header = [
    "Shelfside Runtime Logs",
    `generated_at: ${new Date().toISOString()}`,
    `entries: ${entries.length}`,
    "",
  ];
  const body = entries.map((e) => {
    if (!e.detail) return `[${e.ts}] ${e.level} ${e.event}`;
    return `[${e.ts}] ${e.level} ${e.event}\n${e.detail}`;
  });
  return [...header, ...body].join("\n");
}

export async function copyRuntimeLogsToClipboard() {
  if (!hasWindow() || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard API no disponible en este entorno.");
  }
  await navigator.clipboard.writeText(getRuntimeLogsText());
}
