import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlDb } from "./catalog";
import {
  findCatalogBySource,
  getCatalogById,
  insertCatalogItem,
  updateCatalogItem,
} from "./catalog";

function mockDb(): { db: SqlDb; execute: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> } {
  const execute = vi.fn().mockResolvedValue({ rowsAffected: 0 });
  const select = vi.fn();
  return { db: { execute, select }, execute, select };
}

describe("findCatalogBySource", () => {
  it("devuelve null si no hay filas", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([]);
    expect(await findCatalogBySource(db, "tmdb", "1", "movie")).toBeNull();
  });

  it("devuelve la primera fila", async () => {
    const { db, select } = mockDb();
    const row = {
      id: 1,
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
    };
    select.mockResolvedValueOnce([row]);
    expect(await findCatalogBySource(db, "tmdb", "1", "movie")).toEqual(row);
  });
});

describe("insertCatalogItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserta y devuelve lastInsertId del execute", async () => {
    const { db, execute } = mockDb();
    execute.mockResolvedValueOnce({ lastInsertId: 7, rowsAffected: 1 });
    const id = await insertCatalogItem(db, {
      media_type: "movie",
      source: "tmdb",
      external_id: "9",
      title: "T",
      image_url: "https://x",
    });
    expect(id).toBe(7);
    expect(execute).toHaveBeenCalled();
  });
});

describe("updateCatalogItem", () => {
  it("construye UPDATE con campos provistos", async () => {
    const { db, execute } = mockDb();
    await updateCatalogItem(db, 3, { title: "Nuevo", poster_local_path: "p/x.jpg" });
    const q = String(execute.mock.calls[0]?.[0]);
    expect(q).toContain("UPDATE catalog_item");
    expect(q).toContain("title");
    expect(q).toContain("poster_local_path");
  });
});

describe("getCatalogById", () => {
  it("devuelve null sin resultados", async () => {
    const { db, select } = mockDb();
    select.mockResolvedValueOnce([]);
    expect(await getCatalogById(db, 99)).toBeNull();
  });
});
