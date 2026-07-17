import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import TvProgressPanel from "./TvProgressPanel.svelte";
import type { LibraryListRow } from "$lib/db";

afterEach(() => {
  cleanup();
});

function baseRow(over: Partial<LibraryListRow> = {}): LibraryListRow {
  return {
    id: 1,
    catalog_item_id: 1,
    status: "in_progress",
    score: null,
    current_season: null,
    last_episode_watched: 144,
    progress_current: null,
    progress_total: null,
    owned: 0,
    started_at: null,
    completed_at: null,
    notes: null,
    updated_at: "2026-01-01",
    title: "Dragon Ball Z Kai",
    media_type: "tv",
    source: "tmdb",
    external_id: "1",
    image_url: null,
    poster_local_path: null,
    metadata_json: null,
    ...over,
  } as LibraryListRow;
}

describe("TvProgressPanel", () => {
  it("muestra progreso y permite +1 episodio", async () => {
    const user = userEvent.setup();
    const onBumpEpisode = vi.fn();
    render(TvProgressPanel, {
      props: {
        row: baseRow(),
        tvCatalog: null,
        busy: false,
        onSaveProgress: vi.fn(),
        onBumpEpisode,
      },
    });

    expect(screen.getByText("144")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /\+1 episodio/i }));
    expect(onBumpEpisode).toHaveBeenCalled();
  });

  it("abre editor al tocar el episodio y guarda", async () => {
    const user = userEvent.setup();
    const onSaveProgress = vi.fn().mockResolvedValue(undefined);
    render(TvProgressPanel, {
      props: {
        row: baseRow({ current_season: 2, last_episode_watched: 10 }),
        tvCatalog: null,
        onSaveProgress,
        onBumpEpisode: vi.fn(),
      },
    });

    await user.click(screen.getByRole("button", { name: /Último episodio visto/i }));
    const episodeInput = screen.getByDisplayValue("10");
    await user.clear(episodeInput);
    await user.type(episodeInput, "11");
    await user.click(screen.getByRole("button", { name: /^Guardar$/i }));
    expect(onSaveProgress).toHaveBeenCalledWith({
      current_season: 2,
      last_episode_watched: 11,
    });
  });
});
