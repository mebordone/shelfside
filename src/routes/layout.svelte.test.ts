import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LayoutHarness from "../test/LayoutHarness.svelte";

const { runMigrations, syncSyncFolder, getDatabase, afterLibraryChanged } = vi.hoisted(() => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
  syncSyncFolder: vi.fn().mockResolvedValue({
    merge: { imported: 1, updated: 0, deleted: 0, skipped: 0, errors: [] },
    exported: 1,
  }),
  getDatabase: vi.fn().mockResolvedValue({}),
  afterLibraryChanged: vi.fn(),
}));

vi.mock("$lib/db", () => ({ runMigrations }));
vi.mock("$lib/db/connection", () => ({ getDatabase }));
vi.mock("$lib/sync/syncSyncFolder", () => ({ syncSyncFolder }));
vi.mock("$lib/library/mutations", () => ({ afterLibraryChanged }));

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
    localStorage.setItem("shelfside-sync-dir", "/tmp/sync");
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
    localStorage.setItem("shelfside-sync-dir", "/tmp/sync");
    localStorage.setItem("shelfside-sync-on-start", "1");
    render(LayoutHarness);
    await waitFor(() => {
      expect(screen.getByTestId("layout-child")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(syncSyncFolder).toHaveBeenCalledWith({}, "/tmp/sync");
    });
    await waitFor(() => {
      expect(afterLibraryChanged).toHaveBeenCalled();
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
