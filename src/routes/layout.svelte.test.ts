import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LayoutHarness from "../test/LayoutHarness.svelte";

const { runMigrations } = vi.hoisted(() => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/db", () => ({ runMigrations }));

afterEach(() => {
  cleanup();
});

describe("+layout (arranque)", () => {
  beforeEach(() => {
    runMigrations.mockReset();
    runMigrations.mockResolvedValue(undefined);
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
});
