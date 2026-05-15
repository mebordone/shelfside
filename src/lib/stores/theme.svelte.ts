const STORAGE_KEY = "shelfside-theme";

function readInitial(): "light" | "dark" {
  if (typeof localStorage === "undefined") return "dark";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark") return v;
  return "dark";
}

/** Tema UI: claro / oscuro (persistido). Mutar solo `theme.mode`. */
export const theme = $state({ mode: readInitial() as "light" | "dark" });

export function setTheme(next: "light" | "dark"): void {
  theme.mode = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", next === "dark");
  }
}

export function initTheme(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme.mode === "dark");
}
