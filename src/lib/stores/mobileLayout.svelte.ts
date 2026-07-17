import { isAndroidPlatform } from "$lib/platform";

export const MOBILE_LAYOUT_MQ = "(max-width: 767px)";

export const mobileLayout = $state({ current: false });

let mql: MediaQueryList | null = null;

function computeMobile(): boolean {
  if (isAndroidPlatform()) return true;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(MOBILE_LAYOUT_MQ).matches;
}

function onMqChange(): void {
  mobileLayout.current = computeMobile();
}

/** Suscribe matchMedia; en Android fuerza layout móvil. Devuelve cleanup. */
export function initMobileLayout(): () => void {
  mobileLayout.current = computeMobile();
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  destroyMobileLayout();
  mql = window.matchMedia(MOBILE_LAYOUT_MQ);
  mql.addEventListener("change", onMqChange);
  return destroyMobileLayout;
}

export function destroyMobileLayout(): void {
  if (mql) {
    mql.removeEventListener("change", onMqChange);
    mql = null;
  }
}
