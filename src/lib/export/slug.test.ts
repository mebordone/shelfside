import { describe, expect, it } from "vitest";
import { libraryMarkdownFilename } from "./slug";

describe("libraryMarkdownFilename", () => {
  it("genera slug ascii y shelfside_id", () => {
    expect(libraryMarkdownFilename("Breaking Bad", 42)).toBe("breaking-bad-42.md");
  });

  it("sanitiza caracteres especiales", () => {
    const name = libraryMarkdownFilename("¿Dune: Parte 2?", 7);
    expect(name).toMatch(/-7\.md$/);
    expect(name).not.toMatch(/[¿?]/);
  });
});
