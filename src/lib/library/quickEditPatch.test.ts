import { describe, expect, it } from "vitest";
import {
  isValidNonNegativeIntInput,
  nextEpisode,
  parseNonNegativeIntOrNull,
} from "./quickEditPatch";

describe("quickEditPatch", () => {
  it("parseNonNegativeIntOrNull acepta vacíos y enteros ≥ 0", () => {
    expect(parseNonNegativeIntOrNull("")).toBe(null);
    expect(parseNonNegativeIntOrNull("  ")).toBe(null);
    expect(parseNonNegativeIntOrNull("0")).toBe(0);
    expect(parseNonNegativeIntOrNull("144")).toBe(144);
  });

  it("parseNonNegativeIntOrNull rechaza no enteros", () => {
    expect(parseNonNegativeIntOrNull("-1")).toBeUndefined();
    expect(parseNonNegativeIntOrNull("1.5")).toBeUndefined();
    expect(parseNonNegativeIntOrNull("abc")).toBeUndefined();
  });

  it("isValidNonNegativeIntInput", () => {
    expect(isValidNonNegativeIntInput("")).toBe(true);
    expect(isValidNonNegativeIntInput("3")).toBe(true);
    expect(isValidNonNegativeIntInput("-2")).toBe(false);
  });

  it("nextEpisode", () => {
    expect(nextEpisode(null)).toBe(1);
    expect(nextEpisode(undefined)).toBe(1);
    expect(nextEpisode(144)).toBe(145);
  });
});
