import { describe, expect, it } from "vitest";
import * as db from "./index";

describe("db index", () => {
  it("reexporta getDatabase y runMigrations", () => {
    expect(db.getDatabase).toBeTypeOf("function");
    expect(db.runMigrations).toBeTypeOf("function");
  });
});
