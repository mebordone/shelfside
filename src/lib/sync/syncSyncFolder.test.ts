import { describe, expect, it, vi } from "vitest";
import * as exportSync from "./exportToSyncFolder";
import * as mergeMod from "./mergeFromFolder";
import { syncSyncFolder } from "./syncSyncFolder";

describe("syncSyncFolder", () => {
  it("importa antes de exportar", async () => {
    const order: string[] = [];
    vi.spyOn(mergeMod, "mergeFromSyncFolder").mockImplementation(async () => {
      order.push("merge");
      return { imported: 1, updated: 2, deleted: 0, skipped: 3, errors: [] };
    });
    vi.spyOn(exportSync, "exportToSyncFolder").mockImplementation(async () => {
      order.push("export");
      return 6;
    });

    const db = { select: vi.fn(), execute: vi.fn() };
    const result = await syncSyncFolder(db as never, "/sync");

    expect(order).toEqual(["merge", "export"]);
    expect(result.merge.imported).toBe(1);
    expect(result.exported).toBe(6);
  });
});
