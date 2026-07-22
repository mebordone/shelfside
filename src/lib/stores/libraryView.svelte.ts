const STORAGE_KEY = "shelfside-library-view";

export type LibraryView = "grid" | "list";

const LIBRARY_VIEWS: readonly LibraryView[] = ["grid", "list"];

export function readLibraryView(): LibraryView {
  if (typeof localStorage === "undefined") return "grid";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null && (LIBRARY_VIEWS as readonly string[]).includes(raw)) {
      return raw as LibraryView;
    }
  } catch {
    /* ignore */
  }
  return "grid";
}

export function persistLibraryView(value: LibraryView): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Estado reactivo compartido entre el header móvil y la página Biblioteca. */
export const libraryView = $state<{ current: LibraryView }>({ current: "grid" });

export function initLibraryView(): void {
  libraryView.current = readLibraryView();
}

export function setLibraryView(value: LibraryView): void {
  libraryView.current = value;
  persistLibraryView(value);
}
