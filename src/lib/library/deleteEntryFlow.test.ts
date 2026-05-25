import { describe, expect, it, vi } from "vitest";
import { deleteLibraryEntryWithAssets } from "./deleteEntryFlow";

vi.mock("$lib/db", async (importOriginal) => {
  const orig = await importOriginal<typeof import("$lib/db")>();
  return {
    ...orig,
    getLibraryEntryById: vi.fn(),
    deleteLibraryEntry: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("$lib/poster", () => ({
  removePosterFile: vi.fn().mockResolvedValue(undefined),
}));

describe("deleteLibraryEntryWithAssets", () => {
  it("borra SQL y elimina poster local", async () => {
    const { getLibraryEntryById, deleteLibraryEntry } = await import("$lib/db");
    const { removePosterFile } = await import("$lib/poster");
    vi.mocked(getLibraryEntryById).mockResolvedValueOnce({
      id: 5,
      catalog_item_id: 9,
      poster_local_path: "posters/book_OL1M.jpg",
    } as never);

    const db = {} as never;
    await deleteLibraryEntryWithAssets(db, 5);

    expect(deleteLibraryEntry).toHaveBeenCalledWith(db, 5);
    expect(removePosterFile).toHaveBeenCalledWith("posters/book_OL1M.jpg");
  });
});
