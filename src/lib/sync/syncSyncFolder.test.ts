import { describe, expect, it, vi } from "vitest";
import * as exportCsv from "./exportToSyncCsv";
import * as mergeCsv from "./mergeFromCsv";
import { syncSyncFolder } from "./syncSyncFolder";

describe("syncSyncFolder", () => {
  it("importa CSV antes de exportar CSV", async () => {
    const order: string[] = [];
    vi.spyOn(mergeCsv, "mergeFromSyncCsv").mockImplementation(async () => {
      order.push("merge");
      return { imported: 1, updated: 2, deleted: 0, skipped: 3, errors: [] };
    });
    vi.spyOn(exportCsv, "exportToSyncCsv").mockImplementation(async () => {
      order.push("export");
      return { exported: 6, wrote: true };
    });

    const db = { select: vi.fn(), execute: vi.fn() };
    const result = await syncSyncFolder(db as never, "/sync");

    expect(order).toEqual(["merge", "export"]);
    expect(result.merge.imported).toBe(1);
    expect(result.exported).toBe(6);
  });
});
