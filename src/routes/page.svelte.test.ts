import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
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
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("app_meta")) return Promise.resolve([{ value: "ok" }]);
      return Promise.resolve([]);
    });
    localStorage.removeItem("shelfside-theme");
    document.documentElement.classList.remove("dark");
  });

  it("sin ítems en progreso/planeado muestra mensaje de enfoque", async () => {
    render(Page);
    await waitFor(() => {
      expect(screen.getByText(/No hay títulos en progreso o planeado/i)).toBeInTheDocument();
    });
  });

  it("carga schema desde la base y muestra el valor", async () => {
    render(Page);
    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledWith("SELECT value FROM app_meta WHERE key = $1", ["schema_check"]);
    });
    await waitFor(() => {
      expect(screen.getByRole("code")).toHaveTextContent("ok");
    });
  });

  it("permite alternar tema claro", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Claro/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
