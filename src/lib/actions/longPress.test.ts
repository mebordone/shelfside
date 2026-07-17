import { describe, expect, it, vi } from "vitest";
import { longPress } from "./longPress";

describe("longPress action", () => {
  it("dispara tras hold y cancela si hay movimiento", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.appendChild(el);
    const onLong = vi.fn();
    const action = longPress(el, onLong);

    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 10, button: 0, pointerType: "touch" }),
    );
    vi.advanceTimersByTime(449);
    expect(onLong).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onLong).toHaveBeenCalledTimes(1);

    onLong.mockClear();
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 10, button: 0, pointerType: "touch" }),
    );
    el.dispatchEvent(new PointerEvent("pointermove", { clientX: 40, clientY: 10 }));
    vi.advanceTimersByTime(500);
    expect(onLong).not.toHaveBeenCalled();

    action.destroy?.();
    el.remove();
    vi.useRealTimers();
  });
});
