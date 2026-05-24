import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";

const mockSelect = vi.fn();

vi.mock("$lib/db/connection", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    select: (...args: unknown[]) => mockSelect(...args),
  }),
}));

vi.mock("$lib/poster", () => ({
  resolvePosterDisplayUrl: vi.fn().mockResolvedValue(null),
}));

afterEach(() => {
  cleanup();
});

describe("+page (inicio)", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockSelect.mockResolvedValue([]);
  });

  it("sin ítems en progreso/planeado muestra mensaje de enfoque", async () => {
    render(Page);
    await waitFor(() => {
      expect(screen.getByText(/No hay títulos en progreso, pausados o planeados/i)).toBeInTheDocument();
    });
  });

  it("no muestra controles técnicos de tema ni schema", async () => {
    render(Page);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Claro/i })).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Metadato en base/i)).not.toBeInTheDocument();
  });
});
