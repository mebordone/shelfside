const STORAGE_KEY = "shelfside-home-view";

export type HomeView = "carousel" | "grid";

const HOME_VIEWS: readonly HomeView[] = ["carousel", "grid"];

export function readHomeView(): HomeView {
  if (typeof localStorage === "undefined") return "carousel";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null && (HOME_VIEWS as readonly string[]).includes(raw)) {
      return raw as HomeView;
    }
  } catch {
    /* ignore */
  }
  return "carousel";
}

export function persistHomeView(value: HomeView): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Estado reactivo compartido entre el header móvil y la página de Inicio. */
export const homeView = $state<{ current: HomeView }>({ current: "carousel" });

export function initHomeView(): void {
  homeView.current = readHomeView();
}

export function setHomeView(value: HomeView): void {
  homeView.current = value;
  persistHomeView(value);
}
