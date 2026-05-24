import { describe, expect, it, vi } from "vitest";
import { resetAllUserData } from "./reset";

vi.mock("@tauri-apps/api/path", () => ({
  appLocalDataDir: vi.fn().mockResolvedValue("/data"),
  join: vi.fn(async (...p: string[]) => p.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn().mockResolvedValue([]),
  remove: vi.fn(),
}));

describe("resetAllUserData", () => {
  it("borra library y catalog", async () => {
    const execute = vi.fn().mockResolvedValue({});
    await resetAllUserData({ select: vi.fn(), execute } as never);
    expect(execute).toHaveBeenCalledWith("DELETE FROM library_entry", []);
    expect(execute).toHaveBeenCalledWith("DELETE FROM catalog_item", []);
  });
});
