import { beforeEach, describe, expect, it, vi } from "vitest";

const load = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
  }),
);

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load,
  },
}));

describe("connection", () => {
  beforeEach(async () => {
    vi.resetModules();
    load.mockClear();
    load.mockResolvedValue({
      select: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    });
  });

  it("getDatabase usa sqlite:shelfside.db y reutiliza la misma promesa", async () => {
    const { getDatabase } = await import("./connection");
    const db1 = await getDatabase();
    const db2 = await getDatabase();
    expect(db1).toBe(db2);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("sqlite:shelfside.db");
  });
});
