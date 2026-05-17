import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import FilterChipBar from "./FilterChipBar.svelte";

afterEach(() => {
  cleanup();
});

describe("FilterChipBar", () => {
  it("renderiza opciones y marca la activa", () => {
    render(FilterChipBar, {
      props: {
        options: [
          { value: "movie", label: "Película" },
          { value: "tv", label: "Serie TV" },
        ],
        value: "tv",
        onchange: vi.fn(),
        ariaLabel: "Tipo de medio",
      },
    });

    expect(screen.getByRole("radiogroup", { name: "Tipo de medio" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Serie TV" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Película" })).toHaveAttribute("aria-checked", "false");
  });

  it("incluye chip Todos cuando includeAll", async () => {
    const user = userEvent.setup();
    const onchange = vi.fn();
    render(FilterChipBar, {
      props: {
        options: [{ value: "book", label: "Libro" }],
        value: "book",
        includeAll: true,
        allLabel: "Todos",
        onchange,
        ariaLabel: "Filtro",
      },
    });

    await user.click(screen.getByRole("radio", { name: "Todos" }));
    expect(onchange).toHaveBeenCalledWith("");
  });

  it("onchange al elegir otra opción", async () => {
    const user = userEvent.setup();
    const onchange = vi.fn();
    render(FilterChipBar, {
      props: {
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        value: "a",
        onchange,
        ariaLabel: "Opciones",
      },
    });

    await user.click(screen.getByRole("radio", { name: "B" }));
    expect(onchange).toHaveBeenCalledWith("b");
  });
});
