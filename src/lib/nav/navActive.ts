export type NavSection =
  | "home"
  | "library"
  | "search"
  | "manual"
  | "settings"
  | "stats"
  | "more";

export function navActive(pathname: string, which: NavSection): boolean {
  if (which === "home") return pathname === "/";
  if (which === "library") return pathname.startsWith("/library");
  if (which === "search") return pathname.startsWith("/search");
  if (which === "manual") return pathname.startsWith("/add/manual");
  if (which === "settings") return pathname.startsWith("/settings");
  if (which === "stats") return pathname.startsWith("/stats");
  if (which === "more") {
    return (
      pathname.startsWith("/settings") ||
      pathname.startsWith("/stats") ||
      pathname.startsWith("/add/manual")
    );
  }
  return false;
}

export function navLinkClass(active: boolean): string {
  const base = "rounded px-2 py-1.5 text-sm font-medium transition-colors shelf-touch";
  return active
    ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white`
    : `${base} text-zinc-700 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800`;
}

export function brandClass(active: boolean): string {
  const base =
    "shrink-0 rounded px-2 py-1 text-base font-semibold tracking-tight transition-colors shelf-touch inline-flex items-center";
  return active
    ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white`
    : `${base} text-emerald-900 hover:bg-zinc-200 dark:text-emerald-300 dark:hover:bg-zinc-800`;
}


export function settingsIconClass(active: boolean): string {
  const base =
    "ml-auto inline-flex shrink-0 items-center justify-center rounded-md p-2 transition-colors shelf-touch";
  return active
    ? `${base} bg-emerald-600 text-white shadow-sm dark:bg-emerald-600`
    : `${base} text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800`;
}

export function bottomTabClass(active: boolean): string {
  const base =
    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium transition-colors";
  return active
    ? `${base} text-emerald-700 dark:text-emerald-300`
    : `${base} text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200`;
}
