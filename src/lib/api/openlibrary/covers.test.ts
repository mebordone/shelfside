import { describe, expect, it } from "vitest";
import {
  isReliableOpenLibraryCoverUrl,
  pickOpenLibraryCoverUrl,
} from "./covers";

describe("isReliableOpenLibraryCoverUrl", () => {
  it("acepta /b/id/", () => {
    expect(isReliableOpenLibraryCoverUrl("https://covers.openlibrary.org/b/id/1-L.jpg")).toBe(true);
  });

  it("rechaza /b/olid/", () => {
    expect(isReliableOpenLibraryCoverUrl("https://covers.openlibrary.org/b/olid/OL1M-L.jpg")).toBe(
      false,
    );
  });
});

describe("pickOpenLibraryCoverUrl", () => {
  it("prefiere la primera URL fiable", () => {
    expect(
      pickOpenLibraryCoverUrl(
        "https://covers.openlibrary.org/b/olid/OL1M-L.jpg",
        "https://covers.openlibrary.org/b/id/99-L.jpg",
      ),
    ).toBe("https://covers.openlibrary.org/b/id/99-L.jpg");
  });

  it("devuelve null si ninguna es fiable", () => {
    expect(pickOpenLibraryCoverUrl("https://covers.openlibrary.org/b/olid/OL1M-L.jpg", null)).toBe(
      null,
    );
  });
});
