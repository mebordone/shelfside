import { describe, expect, it } from "vitest";
import { mergeStatusTimestamps, normalizeScore } from "./libraryRules";

describe("normalizeScore", () => {
  it("acepta null y undefined", () => {
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
  });

  it("acepta enteros 1 a 10", () => {
    expect(normalizeScore(1)).toBe(1);
    expect(normalizeScore(10)).toBe(10);
  });

  it("rechaza fuera de rango", () => {
    expect(() => normalizeScore(0)).toThrow();
    expect(() => normalizeScore(11)).toThrow();
    expect(() => normalizeScore(3.5)).toThrow();
  });
});

describe("mergeStatusTimestamps", () => {
  const t0 = "2020-01-01T00:00:00.000Z";
  const t1 = "2025-06-01T12:00:00.000Z";

  it("fija started_at la primera vez que pasa a in_progress", () => {
    const r = mergeStatusTimestamps("planning", "in_progress", { started_at: null, completed_at: null }, t1);
    expect(r.started_at).toBe(t1);
    expect(r.completed_at).toBeNull();
  });

  it("no sobrescribe started_at si ya existía", () => {
    const r = mergeStatusTimestamps("paused", "in_progress", { started_at: t0, completed_at: null }, t1);
    expect(r.started_at).toBe(t0);
  });

  it("no fija started_at si ya estaba en in_progress", () => {
    const r = mergeStatusTimestamps("in_progress", "in_progress", { started_at: t0, completed_at: null }, t1);
    expect(r.started_at).toBe(t0);
  });

  it("fija completed_at la primera vez que pasa a completed", () => {
    const r = mergeStatusTimestamps("in_progress", "completed", { started_at: t0, completed_at: null }, t1);
    expect(r.completed_at).toBe(t1);
    expect(r.started_at).toBe(t0);
  });

  it("no borra completed_at al volver a planning", () => {
    const r = mergeStatusTimestamps("completed", "planning", { started_at: t0, completed_at: t1 }, t1);
    expect(r.completed_at).toBe(t1);
    expect(r.started_at).toBe(t0);
  });
});
