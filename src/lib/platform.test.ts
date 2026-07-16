import { describe, expect, it } from "vitest";
import { ANDROID_DEFAULT_SYNC_DIR, isAndroidPlatform } from "./platform";

describe("isAndroidPlatform", () => {
  it("es false en entorno de test (jsdom sin Android UA)", () => {
    expect(isAndroidPlatform()).toBe(false);
  });
});

describe("ANDROID_DEFAULT_SYNC_DIR", () => {
  it("apunta a la carpeta Sync típica", () => {
    expect(ANDROID_DEFAULT_SYNC_DIR).toBe("/storage/emulated/0/Sync");
  });
});
