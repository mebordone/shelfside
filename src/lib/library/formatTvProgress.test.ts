import { describe, expect, it } from "vitest";
import { formatTvProgress } from "./formatTvProgress";

describe("formatTvProgress", () => {
  it("devuelve null sin temporada ni episodio", () => {
    expect(formatTvProgress(null, null)).toBeNull();
  });

  it("formatea temporada y episodio", () => {
    expect(formatTvProgress(2, 4)).toBe("T2 · E4");
  });

  it("solo temporada si falta episodio", () => {
    expect(formatTvProgress(2, null)).toBe("T2");
  });

  it("solo episodio si falta temporada", () => {
    expect(formatTvProgress(null, 144)).toBe("E144");
  });
});
