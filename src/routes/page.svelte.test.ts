import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";

const mockSelect = vi.fn().mockResolvedValue([{ value: "ok" }]);

vi.mock("$lib/db/connection", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    select: (...args: unknown[]) => mockSelect(...args),
  }),
}));

afterEach(() => {
  cleanup();
});

describe("+page (inicio)", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockSelect.mockResolvedValue([{ value: "ok" }]);
    localStorage.removeItem("shelfside-theme");
    document.documentElement.classList.remove("dark");
  });

  it("muestra título y textos de i18n", () => {
    render(Page);
    expect(screen.getByRole("heading", { name: /Shelfside/i })).toBeInTheDocument();
    expect(screen.getByText(/biblioteca cultural local/i)).toBeInTheDocument();
  });

  it("carga schema desde la base y muestra el valor", async () => {
    render(Page);
    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledWith(
        "SELECT value FROM app_meta WHERE key = $1",
        ["schema_check"],
      );
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
