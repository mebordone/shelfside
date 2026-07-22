import { describe, expect, it, vi } from "vitest";
import { scheduleEphemeralClear } from "./ephemeralMessage";

describe("scheduleEphemeralClear", () => {
  it("limpia el mensaje tras el timeout si no cambió", () => {
    vi.useFakeTimers();
    let msg: string | null = "ok";
    const cleanup = scheduleEphemeralClear(
      () => msg,
      (v) => {
        msg = v;
      },
      2500,
    );
    expect(msg).toBe("ok");
    vi.advanceTimersByTime(2500);
    expect(msg).toBeNull();
    cleanup();
    vi.useRealTimers();
  });

  it("no limpia si el mensaje cambió antes", () => {
    vi.useFakeTimers();
    let msg: string | null = "ok";
    const cleanup = scheduleEphemeralClear(
      () => msg,
      (v) => {
        msg = v;
      },
      2500,
    );
    msg = "otro";
    vi.advanceTimersByTime(2500);
    expect(msg).toBe("otro");
    cleanup();
    vi.useRealTimers();
  });

  it("no-op si no hay mensaje", () => {
    const cleanup = scheduleEphemeralClear(
      () => null,
      () => {},
    );
    cleanup();
  });
});
