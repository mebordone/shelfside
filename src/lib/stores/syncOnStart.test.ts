import { beforeEach, describe, expect, it } from "vitest";
import { persistSyncFolder, clearSyncFolder } from "./syncFolder";
import { persistSyncOnStart, readSyncOnStart } from "./syncOnStart";

describe("syncOnStart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sin clave y sin carpeta → false", () => {
    expect(readSyncOnStart()).toBe(false);
  });

  it("sin clave y con carpeta → true", () => {
    persistSyncFolder("/home/me/Sync/shelfside");
    expect(readSyncOnStart()).toBe(true);
  });

  it("clave 0 fuerza false aunque haya carpeta", () => {
    persistSyncFolder("/home/me/Sync/shelfside");
    persistSyncOnStart(false);
    expect(readSyncOnStart()).toBe(false);
  });

  it("clave 1 fuerza true aunque no haya carpeta", () => {
    clearSyncFolder();
    persistSyncOnStart(true);
    expect(readSyncOnStart()).toBe(true);
  });
});
