import { describe, expect, it, vi } from "vitest";
import * as library from "$lib/db/library";
import { parseMarkdownEntry } from "$lib/sync/parseMarkdown";
import { exportAllMarkdownToFolder } from "./markdown";

const written = new Map<string, string>();

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn(async (path: string, content: string) => {
    written.set(path, content);
  }),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => parts.join("/")),
}));

describe("exportAllMarkdownToFolder", () => {
  it("ignora mkdir si library/ ya existe", async () => {
    const { mkdir } = await import("@tauri-apps/plugin-fs");
    vi.mocked(mkdir).mockRejectedValueOnce(new Error("failed to create directory: File exists (os error 17)"));
    vi.spyOn(library, "listLibraryWithCatalog").mockResolvedValueOnce([]);

    const db = { select: vi.fn().mockResolvedValue([]) };
    await expect(exportAllMarkdownToFolder(db as never, "/vault/sync")).resolves.toBe(0);
  });

  it("ignora mkdir si Tauri bloquea allow-mkdir en carpeta ya existente", async () => {
    const { mkdir } = await import("@tauri-apps/plugin-fs");
    vi.mocked(mkdir).mockRejectedValueOnce(
      new Error(
        "forbidden path: /home/mebordone/Descargas/shelfside-library/library, maybe it is not allowed on the scope for `allow-mkdir` permission in your capability file",
      ),
    );
    vi.spyOn(library, "listLibraryWithCatalog").mockResolvedValueOnce([]);

    const db = { select: vi.fn().mockResolvedValue([]) };
    await expect(exportAllMarkdownToFolder(db as never, "/home/mebordone/Descargas/shelfside-library")).resolves.toBe(0);
  });

  it("escribe .md con frontmatter que parseMarkdown acepta (export → import)", async () => {
    written.clear();
    vi.spyOn(library, "listLibraryWithCatalog").mockResolvedValue([
      {
        id: 7,
        catalog_item_id: 3,
        title: "Fundación",
        media_type: "book",
        source: "openlibrary",
        external_id: "OL1M",
        status: "completed",
        score: null,
        current_season: null,
        last_episode_watched: null,
        progress_current: null,
        progress_total: null,
        owned: null,
        started_at: null,
        completed_at: "2026-05-20T00:00:00.000Z",
        notes: "Relectura",
        image_url: "https://covers.openlibrary.org/b/id/1-L.jpg",
        poster_local_path: null,
        metadata_json: null,
        updated_at: "2026-05-23T10:00:00.000Z",
      },
    ]);

    const db = {
      select: vi.fn().mockResolvedValue([{ id: 3, updated_at: "2026-05-22T00:00:00.000Z" }]),
    };

    const n = await exportAllMarkdownToFolder(db as never, "/vault/sync");
    expect(n).toBe(1);
    expect(written.size).toBe(1);

    const md = [...written.values()][0]!;
    const parsed = parseMarkdownEntry(md);
    expect(parsed.shelfside_id).toBe(7);
    expect(parsed.title).toBe("Fundación");
    expect(parsed.notes).toBe("Relectura");
    expect(parsed.status).toBe("completed");
    expect(parsed.external_id).toBe("OL1M");
    expect(parsed.catalog_updated_at).toBe("2026-05-22T00:00:00.000Z");
  });
});
