import { describe, expect, it } from "vitest";
import { guessImageExtFromPath, posterRelativePath } from "./storage";

describe("posterRelativePath", () => {
  it("genera ruta bajo posters/", () => {
    expect(posterRelativePath("movie", 12, "jpg")).toBe("posters/movie_12.jpg");
  });
});

describe("guessImageExtFromPath", () => {
  it("detecta extensión común", () => {
    expect(guessImageExtFromPath("/a/b.PNG")).toBe("png");
    expect(guessImageExtFromPath("x.jpeg")).toBe("jpg");
  });
});
