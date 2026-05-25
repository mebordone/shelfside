import { describe, expect, it } from "vitest";
import { parseMarkdownEntry, serializeMarkdownEntry, splitFrontmatter } from "./parseMarkdown";

const SAMPLE = `---
shelfside_id: 42
updated_at: "2026-05-23T12:00:00.000Z"
title: "Dune"
media_type: movie
source: tmdb
external_id: "123"
status: in_progress
score: 8
current_season: null
last_episode_watched: null
started_at: null
completed_at: null
image_url: null
catalog_updated_at: "2026-05-20T00:00:00.000Z"
---
Notas de la obra.
`;

describe("parseMarkdown", () => {
  it("divide frontmatter", () => {
    const s = splitFrontmatter(SAMPLE);
    expect(s?.yaml).toContain("shelfside_id: 42");
    expect(s?.body.trim()).toBe("Notas de la obra.");
  });

  it("parsea entrada válida", () => {
    const e = parseMarkdownEntry(SAMPLE);
    expect(e.shelfside_id).toBe(42);
    expect(e.title).toBe("Dune");
    expect(e.notes).toBe("Notas de la obra.");
  });

  it("serializa y re-parsea roundtrip básico", () => {
    const md = serializeMarkdownEntry({
      id: 5,
      updated_at: "2026-01-02T00:00:00.000Z",
      title: "Test",
      media_type: "book",
      source: "manual",
      external_id: "uuid-1",
      status: "planning",
      score: null,
      current_season: null,
      last_episode_watched: null,
      progress_current: 120,
      progress_total: 400,
      owned: 1,
      started_at: null,
      completed_at: null,
      image_url: null,
      catalog_updated_at: null,
      notes: "hola",
    });
    const e = parseMarkdownEntry(md);
    expect(e.shelfside_id).toBe(5);
    expect(e.notes).toBe("hola");
    expect(e.progress_current).toBe(120);
    expect(e.progress_total).toBe(400);
    expect(e.owned).toBe(1);
  });

  it("archivos viejos sin progress/owned parsean como null", () => {
    const e = parseMarkdownEntry(SAMPLE);
    expect(e.progress_current).toBeNull();
    expect(e.progress_total).toBeNull();
    expect(e.owned).toBeNull();
  });

  it("falla sin shelfside_id", () => {
    expect(() => parseMarkdownEntry("---\ntitle: x\n---\n")).toThrow();
  });
});
