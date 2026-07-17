import { beforeEach, describe, expect, it } from "vitest";
import {
  homeView,
  initHomeView,
  persistHomeView,
  readHomeView,
  setHomeView,
} from "./homeView.svelte";

describe("homeView", () => {
  beforeEach(() => {
    localStorage.clear();
    homeView.current = "carousel";
  });

  it("readHomeView devuelve carousel por defecto", () => {
    expect(readHomeView()).toBe("carousel");
  });

  it("persistHomeView guarda y readHomeView lee grid", () => {
    persistHomeView("grid");
    expect(readHomeView()).toBe("grid");
  });

  it("readHomeView ignora valores inválidos", () => {
    localStorage.setItem("shelfside-home-view", "banana");
    expect(readHomeView()).toBe("carousel");
  });

  it("setHomeView actualiza estado reactivo y persiste", () => {
    setHomeView("grid");
    expect(homeView.current).toBe("grid");
    expect(readHomeView()).toBe("grid");
  });

  it("initHomeView hidrata desde localStorage", () => {
    persistHomeView("grid");
    homeView.current = "carousel";
    initHomeView();
    expect(homeView.current).toBe("grid");
  });
});
