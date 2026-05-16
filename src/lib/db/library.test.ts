import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlDb } from "./catalog";
import {
  addManualToLibrary,
  addTmdbToLibrary,
  getLibraryEntryById,
  getTmdbHitsLibraryPresence,
  listLibraryWithCatalog,
  updateLibraryEntry,
} from "./library";

function mockDb(): { db: SqlDb; execute: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> } {
  const execute = vi.fn().mockResolvedValue({ rowsAffected: 0 });
  const select = vi.fn();
  return { db: { execute, select }, execute, select };
}

describe("getTmdbHitsLibraryPresence", () => {
  it("devuelve library_id por hit o null", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([
      { media_type: "movie", external_id: "10", library_id: 100 },
      { media_type: "tv", external_id: "20", library_id: 200 },
    ]);

    const m = await getTmdbHitsLibraryPresence(db, [
      { mediaType: "movie", id: 10 },
      { mediaType: "tv", id: 20 },
      { mediaType: "movie", id: 99 },
    ]);

    expect(m.get("movie-10")).toBe(100);
    expect(m.get("tv-20")).toBe(200);
    expect(m.get("movie-99")).toBeNull();
    const q = String(select.mock.calls[0]?.[0]);
    expect(q).toContain("IN ($1, $2, $3)");
    expect(select.mock.calls[0]?.[1]).toEqual(["10:movie", "20:tv", "99:movie"]);
  });
});

describe("addManualToLibrary", () => {
  it("inserta catálogo y biblioteca", async () => {
    const { db, execute } = mockDb();
    let insertSeq = 0;
    execute.mockImplementation(async (q: string) => {
      if (String(q).includes("INSERT INTO catalog_item")) {
        insertSeq += 1;
        return { lastInsertId: insertSeq, rowsAffected: 1 };
      }
      if (String(q).includes("INSERT INTO library_entry")) {
        insertSeq += 1;
        return { lastInsertId: insertSeq, rowsAffected: 1 };
      }
      return { rowsAffected: 0 };
    });

    const r = await addManualToLibrary(db, { title: "Mi obra", notes: "n" });

    expect(r.catalogId).toBeGreaterThan(0);
    expect(r.libraryId).toBeGreaterThan(0);
    const insertCat = execute.mock.calls.find((c) => String(c[0]).includes("INSERT INTO catalog_item"));
    expect(insertCat?.[1]).toEqual(
      expect.arrayContaining(["movie", "manual", expect.any(String), "Mi obra", null, null, null]),
    );
  });
});

describe("addTmdbToLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea catálogo y biblioteca si no existen", async () => {
    const { db, execute, select } = mockDb();
    execute.mockImplementation(async (q: string) => {
      const s = String(q);
      if (s.includes("INSERT INTO catalog_item")) return { lastInsertId: 1, rowsAffected: 1 };
      if (s.includes("INSERT INTO library_entry")) return { lastInsertId: 2, rowsAffected: 1 };
      return { rowsAffected: 0 };
    });
    select.mockImplementation(async (q: string) => {
      if (String(q).includes("FROM catalog_item WHERE source")) {
        return [];
      }
      if (String(q).includes("FROM library_entry WHERE catalog_item_id")) {
        return [];
      }
      return [];
    });

    const r = await addTmdbToLibrary(db, {
      media_type: "movie",
      source: "tmdb",
      external_id: "99",
      title: "Film",
      image_url: "https://x/p.jpg",
    });

    expect(r.alreadyInLibrary).toBe(false);
    expect(execute).toHaveBeenCalled();
    expect(r.catalogId).toBe(1);
    const libIns = execute.mock.calls.find((c) => String(c[0]).includes("INSERT INTO library_entry"));
    expect(libIns?.[1]?.[1]).toBe("planning");
    expect(libIns?.[1]?.[3]).toBeNull();
    expect(libIns?.[1]?.[4]).toBeNull();
  });

  it("inserta in_progress con started_at al pasar initial_status", async () => {
    const { db, execute, select } = mockDb();
    execute.mockImplementation(async (q: string) => {
      const s = String(q);
      if (s.includes("INSERT INTO catalog_item")) return { lastInsertId: 1, rowsAffected: 1 };
      if (s.includes("INSERT INTO library_entry")) return { lastInsertId: 2, rowsAffected: 1 };
      return { rowsAffected: 0 };
    });
    select.mockImplementation(async (q: string) => {
      if (String(q).includes("FROM catalog_item WHERE source")) {
        return [];
      }
      if (String(q).includes("FROM library_entry WHERE catalog_item_id")) {
        return [];
      }
      return [];
    });

    await addTmdbToLibrary(
      db,
      {
        media_type: "movie",
        source: "tmdb",
        external_id: "99",
        title: "Film",
        image_url: "https://x/p.jpg",
      },
      { initial_status: "in_progress" },
    );

    const libIns = execute.mock.calls.find((c) => String(c[0]).includes("INSERT INTO library_entry"));
    expect(libIns?.[1]?.[1]).toBe("in_progress");
    expect(libIns?.[1]?.[3]).toEqual(expect.any(String));
    expect(libIns?.[1]?.[4]).toBeNull();
  });

  it("detecta ya en biblioteca", async () => {
    const { db, execute, select } = mockDb();
    select.mockImplementation(async (q: string) => {
      if (String(q).includes("FROM catalog_item WHERE source")) {
        return [
          {
            id: 5,
            media_type: "movie",
            source: "tmdb",
            external_id: "1",
            title: "X",
            image_url: null,
            poster_local_path: null,
            season_number: null,
            episode_number: null,
            parent_catalog_id: null,
            metadata_json: null,
            created_at: "",
            updated_at: "",
          },
        ];
      }
      if (String(q).includes("FROM library_entry WHERE catalog_item_id")) {
        return [{ id: 42 }];
      }
      return [];
    });

    const r = await addTmdbToLibrary(db, {
      media_type: "movie",
      source: "tmdb",
      external_id: "1",
      title: "X",
      image_url: null,
    });

    expect(r.alreadyInLibrary).toBe(true);
    expect(r.libraryId).toBe(42);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("listLibraryWithCatalog", () => {
  it("añade filtros opcionales", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([]);

    await listLibraryWithCatalog(db, { mediaType: "movie", status: "planning", search: "ab" });

    const q = String(select.mock.calls[0]?.[0]);
    expect(q).toContain("ci.media_type = $1");
    expect(q).toContain("le.status = $2");
    expect(q).toContain("LIKE");
  });
});

describe("updateLibraryEntry", () => {
  it("lanza si no existe la fila", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([]);

    await expect(updateLibraryEntry(db, 1, { status: "completed" })).rejects.toThrow("no encontrada");
  });

  it("persiste cambios con timestamps", async () => {
    const { db, execute, select } = mockDb();
    select.mockResolvedValueOnce([
      {
        id: 1,
        catalog_item_id: 9,
        status: "planning",
        score: null,
        current_season: null,
        last_episode_watched: null,
        progress_current: null,
        progress_total: null,
        owned: null,
        started_at: null,
        completed_at: null,
        notes: null,
        updated_at: "",
        media_type: "movie",
        source: "tmdb",
        external_id: "1",
        title: "T",
        image_url: null,
        poster_local_path: null,
        metadata_json: null,
      },
    ]);

    await updateLibraryEntry(db, 1, { status: "in_progress" });

    const upd = execute.mock.calls[0];
    expect(String(upd?.[0])).toContain("UPDATE library_entry");
    expect(upd?.[1]).toEqual(
      expect.arrayContaining(["in_progress", null, null, null, null, expect.any(String), null, 1]),
    );
  });
});

describe("getLibraryEntryById", () => {
  it("devuelve null si no hay filas", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([]);
    expect(await getLibraryEntryById(db, 3)).toBeNull();
  });
});
