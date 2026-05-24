import { describe, expect, it, vi } from "vitest";
import { countByMediaType, countByStatus, countLibraryEntries } from "./stats";

describe("db/stats", () => {
  it("agrega por estado y tipo", async () => {
    const db = {
      select: vi.fn(async (sql: string) => {
        if (sql.includes("GROUP BY status")) {
          return [{ status: "planning", n: 2 }];
        }
        if (sql.includes("GROUP BY c.media_type")) {
          return [{ media_type: "movie", n: 2 }];
        }
        return [{ n: 2 }];
      }),
    };

    expect(await countByStatus(db as never)).toEqual([{ status: "planning", n: 2 }]);
    expect(await countByMediaType(db as never)).toEqual([{ media_type: "movie", n: 2 }]);
    expect(await countLibraryEntries(db as never)).toBe(2);
  });
});
