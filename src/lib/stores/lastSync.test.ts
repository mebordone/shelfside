import { beforeEach, describe, expect, it } from "vitest";
import { formatDateTime, formatRelativeTime, persistLastSync, readLastSync } from "./lastSync";

describe("lastSync", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("readLastSync es null por defecto", () => {
    expect(readLastSync()).toBeNull();
  });

  it("persiste y recupera una entrada válida", () => {
    persistLastSync({ at: 1000, kind: "ok", summary: "hecho" });
    expect(readLastSync()).toEqual({ at: 1000, kind: "ok", summary: "hecho" });
  });

  it("ignora JSON corrupto o con forma inválida", () => {
    localStorage.setItem("shelfside-last-sync", "{ not json");
    expect(readLastSync()).toBeNull();
    localStorage.setItem("shelfside-last-sync", JSON.stringify({ at: "x" }));
    expect(readLastSync()).toBeNull();
  });

  it("formatRelativeTime da etiquetas relativas", () => {
    const now = 10_000_000;
    expect(formatRelativeTime(now, now)).toBe("recién");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("hace 5 min");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("hace 3 h");
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe("hace 2 d");
  });

  it("formatDateTime incluye fecha y hora", () => {
    const at = Date.UTC(2026, 6, 20, 12, 30, 0);
    const es = formatDateTime(at, "es");
    const en = formatDateTime(at, "en");
    expect(es).toMatch(/2026/);
    expect(en).toMatch(/2026/);
    expect(es.length).toBeGreaterThan(8);
  });
});
