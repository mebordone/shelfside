import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LayoutHarness from "../test/LayoutHarness.svelte";

const { runMigrations, syncSyncFolder, getDatabase, afterLibraryChanged, mobileLayout, pageState } =
  vi.hoisted(() => ({
    runMigrations: vi.fn().mockResolvedValue(undefined),
    syncSyncFolder: vi.fn().mockResolvedValue({
      merge: { imported: 1, updated: 0, deleted: 0, skipped: 0, errors: [] },
      exported: 1,
    }),
    getDatabase: vi.fn().mockResolvedValue({}),
    afterLibraryChanged: vi.fn(),
    mobileLayout: { current: false },
    pageState: { url: { pathname: "/" }, params: {} },
  }));

vi.mock("$lib/db", () => ({ runMigrations }));
vi.mock("$lib/db/connection", () => ({ getDatabase }));
vi.mock("$lib/sync/syncSyncFolder", () => ({ syncSyncFolder }));
vi.mock("$lib/library/mutations", () => ({ afterLibraryChanged }));
vi.mock("$lib/stores/mobileLayout.svelte", () => ({
  mobileLayout,
  initMobileLayout: vi.fn(() => () => {}),
  destroyMobileLayout: vi.fn(),
}));
vi.mock("$app/state", () => ({
  get page() {
    return pageState;
  },
}));

afterEach(() => {
  cleanup();
});

describe("+layout (arranque)", () => {
  beforeEach(() => {
    runMigrations.mockReset();
    runMigrations.mockResolvedValue(undefined);
    syncSyncFolder.mockClear();
    getDatabase.mockClear();
    afterLibraryChanged.mockClear();
    mobileLayout.current = false;
    pageState.url.pathname = "/";
    localStorage.clear();
    localStorage.removeItem("shelfside-theme");
    document.documentElement.classList.remove("dark");
  });

  it("muestra carga y luego el snippet hijo cuando runMigrations termina", async () => {
    render(LayoutHarness);
    expect(screen.getByText(/Iniciando/i)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByTestId("layout-child")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(runMigrations).toHaveBeenCalledTimes(1);
  });

  it("muestra error si runMigrations falla", async () => {
    runMigrations.mockRejectedValueOnce(new Error("fallo-migraciones"));
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByText(/fallo-migraciones/)).toBeInTheDocument();
    });
  });

  it("no sincroniza al abrir si el toggle está off", async () => {
    localStorage.setItem("shelfside-sync-dir", "/vault/sync");
    localStorage.setItem("shelfside-sync-on-start", "0");
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(syncSyncFolder).not.toHaveBeenCalled();
  });

  it("no sincroniza al abrir si no hay carpeta", async () => {
    localStorage.setItem("shelfside-sync-on-start", "1");
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(syncSyncFolder).not.toHaveBeenCalled();
  });

  it("sincroniza al abrir cuando hay carpeta y toggle activo", async () => {
    localStorage.setItem("shelfside-sync-dir", "/vault/sync");
    localStorage.setItem("shelfside-sync-on-start", "1");
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(syncSyncFolder).toHaveBeenCalledWith({}, "/vault/sync");
    });
    await waitFor(() => {
      expect(afterLibraryChanged).toHaveBeenCalled();
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("si el sync al abrir falla, la UI igual carga y muestra el error", async () => {
    localStorage.setItem("shelfside-sync-dir", "/vault/sync");
    localStorage.setItem("shelfside-sync-on-start", "1");
    syncSyncFolder.mockRejectedValueOnce(new Error("fs-denied"));
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/fs-denied/)).toBeInTheDocument();
    });
    expect(runMigrations).toHaveBeenCalled();
  });

  it("en desktop muestra top nav y no bottom nav", async () => {
    mobileLayout.current = false;
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    expect(screen.getByTestId("top-nav")).toBeInTheDocument();
    expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
  });

  it("en móvil muestra bottom nav y la hoja Más", async () => {
    mobileLayout.current = true;
    const user = userEvent.setup();
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    // En Inicio (/) el MobileHeader ahora es visible (marca + toggle de vista).
    expect(screen.getByTestId("mobile-header")).toBeInTheDocument();
    expect(screen.queryByTestId("top-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("more-sheet")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("nav-more-tab"));
    expect(screen.getByTestId("more-sheet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configuración|Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Estadísticas|Statistics/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Añadir manual|Add manual/i })).toBeInTheDocument();
  });
});
