import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapLibraryRowsWithPosters } from "./mapWithDisplayUrl";

vi.mock("@tauri-apps/api/path", () => ({
  appLocalDataDir: vi.fn().mockResolvedValue("/appdata"),
}));

vi.mock("./displayUrl", () => ({
  resolvePosterDisplayUrl: vi.fn(async (_local: string | null, remote: string | null) => remote),
}));

describe("mapLibraryRowsWithPosters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("añade displayUrl a cada fila", async () => {
    const rows = await mapLibraryRowsWithPosters([
      {
        id: 1,
        poster_local_path: null,
        image_url: "https://example.com/a.jpg",
      },
    ]);
    expect(rows[0]?.displayUrl).toBe("https://example.com/a.jpg");
  });
});
