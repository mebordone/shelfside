import { describe, expect, it, vi } from "vitest";
import { TmdbConfigError, TmdbHttpError } from "./tmdb/errors";

vi.mock("$lib/i18n", () => ({
  t: (key: string) => key,
}));

describe("userFacingError", () => {
  it("mapea HTTP TMDB y red", async () => {
    const { userFacingError } = await import("./userFacingError");
    expect(userFacingError(new TmdbHttpError("x", 401))).toBe("search.api_unauthorized");
    expect(userFacingError(new TmdbHttpError("x", 429, 12))).toBe("search.api_rate_limit (12s)");
    expect(userFacingError(new TmdbHttpError("x", 503))).toBe("search.api_unavailable");
    expect(userFacingError(new Error("Failed to fetch"))).toBe("search.network_error");
    expect(userFacingError(new TmdbConfigError("falta clave"))).toBe("falta clave");
    expect(userFacingError(new Error("otro"))).toBe("otro");
  });
});
