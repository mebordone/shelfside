import { describe, expect, it } from "vitest";
import { initAppLocale } from "$lib/i18n";
import { formatSyncSummary } from "./formatSyncSummary";

describe("formatSyncSummary", () => {
  it("formatea resumen sin errores", () => {
    initAppLocale();
    const text = formatSyncSummary({ imported: 2, updated: 5, skipped: 58, errors: [] }, 61);
    expect(text).toContain("2");
    expect(text).toContain("5");
    expect(text).toContain("58");
    expect(text).toContain("61");
  });

  it("incluye primer error si hay fallos", () => {
    initAppLocale();
    const text = formatSyncSummary(
      { imported: 0, updated: 0, skipped: 1, errors: ["foo.md: parse error"] },
      0,
    );
    expect(text).toContain("foo.md");
    expect(text).toMatch(/1 error/i);
  });
});
