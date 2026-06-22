import { describe, expect, it } from "vitest";
import { initAppLocale } from "$lib/i18n";
import { formatCleanRecycleSummary } from "./formatCleanRecycleSummary";

describe("formatCleanRecycleSummary", () => {
  it("formatea resumen de limpieza", () => {
    initAppLocale();
    const text = formatCleanRecycleSummary({ removed: 3, skipped: 1, errors: [] });
    expect(text).toContain("3");
    expect(text).toContain("1");
  });
});
