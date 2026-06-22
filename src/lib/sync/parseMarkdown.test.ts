import { describe, expect, it } from "vitest";
import { parseMarkdownEntry, serializeMarkdownEntry, serializeTombstoneEntry, splitFrontmatter } from "./parseMarkdown";

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

  it("parsea tombstone con deleted_at", () => {
    const md = serializeTombstoneEntry(
      {
        id: 9,
        updated_at: "2026-01-01T00:00:00.000Z",
        title: "Old Film",
        media_type: "movie",
        source: "tmdb",
        external_id: "99",
        status: "completed",
        score: 7,
        current_season: null,
        last_episode_watched: null,
        progress_current: null,
        progress_total: null,
        owned: null,
        started_at: null,
        completed_at: null,
        image_url: null,
        catalog_updated_at: null,
      },
      "2026-05-25T10:00:00.000Z",
    );
    const e = parseMarkdownEntry(md);
    expect(e.deleted).toBe(true);
    expect(e.deleted_at).toBe("2026-05-25T10:00:00.000Z");
    expect(e.shelfside_id).toBe(9);
  });

  it("archivos vivos tienen deleted false", () => {
    const e = parseMarkdownEntry(SAMPLE);
    expect(e.deleted).toBe(false);
    expect(e.deleted_at).toBeNull();
  });

  it("manual con external_id UUID sobrevive roundtrip serialize/parse", () => {
    const manualUuid = "550e8400-e29b-41d4-a716-446655440000";
    const md = serializeMarkdownEntry({
      id: 12,
      updated_at: "2026-01-02T00:00:00.000Z",
      title: "Cuaderno",
      media_type: "book",
      source: "manual",
      external_id: manualUuid,
      status: "planning",
      score: null,
      current_season: null,
      last_episode_watched: null,
      progress_current: null,
      progress_total: null,
      owned: null,
      started_at: null,
      completed_at: null,
      image_url: null,
      catalog_updated_at: null,
      notes: "notas",
    });
    const e = parseMarkdownEntry(md);
    expect(e.source).toBe("manual");
    expect(e.external_id).toBe(manualUuid);
  });
});
