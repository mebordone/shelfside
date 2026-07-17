/** Svelte action: long-press (~450ms) o contextmenu en desktop. */
export type LongPressDetail = { clientX: number; clientY: number };

const HOLD_MS = 450;
const MOVE_PX = 10;

export function longPress(node: HTMLElement, onLongPress: (d: LongPressDetail) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  function clear() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    fired = false;
    startX = e.clientX;
    startY = e.clientY;
    clear();
    timer = setTimeout(() => {
      fired = true;
      onLongPress({ clientX: e.clientX, clientY: e.clientY });
    }, HOLD_MS);
  }

  function onPointerMove(e: PointerEvent) {
    if (timer == null) return;
    if (Math.abs(e.clientX - startX) > MOVE_PX || Math.abs(e.clientY - startY) > MOVE_PX) {
      clear();
    }
  }

  function onPointerUp() {
    clear();
  }

  function onClick(e: MouseEvent) {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
      fired = false;
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    onLongPress({ clientX: e.clientX, clientY: e.clientY });
  }

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerUp);
  node.addEventListener("click", onClick, true);
  node.addEventListener("contextmenu", onContextMenu);

  return {
    destroy() {
      clear();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerUp);
      node.removeEventListener("click", onClick, true);
      node.removeEventListener("contextmenu", onContextMenu);
    },
  };
}
