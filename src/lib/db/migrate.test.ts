import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      select: vi.fn(),
      execute: vi.fn(),
    }),
  },
}));

vi.mock("./connection", () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from "./connection";
import { runMigrations, splitStatements } from "./migrate";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("splitStatements", () => {
  it("no descarta CREATE cuando el bloque empieza con comentario --", () => {
    const path = join(__dirname, "../../../migrations/001_initial.sql");
    const raw = readFileSync(path, "utf-8");
    const stmts = splitStatements(raw);
    expect(stmts.length).toBe(3);
    expect(stmts[0]).toContain("CREATE TABLE IF NOT EXISTS migrations");
    expect(stmts[1]).toContain("CREATE TABLE IF NOT EXISTS app_meta");
    expect(stmts[2]).toContain("INSERT OR IGNORE INTO app_meta");
  });

  it("bloque solo con comentarios de línea no produce sentencias", () => {
    expect(splitStatements("-- a\n-- b\n")).toEqual([]);
  });

  it("una sentencia sin comentarios previos", () => {
    const stmts = splitStatements("CREATE TABLE x (id INTEGER PRIMARY KEY);\n");
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toContain("CREATE TABLE x");
  });
});

describe("runMigrations", () => {
  beforeEach(() => {
    vi.mocked(getDatabase).mockReset();
  });

  it("ejecuta SQL pendiente y registra la migración en la tabla migrations", async () => {
    const execute = vi.fn().mockResolvedValue({});
    const select = vi.fn().mockRejectedValueOnce(new Error("no such table: migrations"));
    vi.mocked(getDatabase).mockResolvedValue({ execute, select } as never);

    await runMigrations();

    expect(select).toHaveBeenCalled();
    expect(execute.mock.calls.length).toBeGreaterThanOrEqual(4);
    const insertMigration = execute.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO migrations"),
    );
    expect(insertMigration).toBeDefined();
  });

  it("no ejecuta SQL si la migración ya consta como aplicada", async () => {
    const execute = vi.fn().mockResolvedValue({});
    const select = vi.fn().mockResolvedValue([{ c: 1 }]);
    vi.mocked(getDatabase).mockResolvedValue({ execute, select } as never);

    await runMigrations();

    expect(execute).not.toHaveBeenCalled();
  });
});
