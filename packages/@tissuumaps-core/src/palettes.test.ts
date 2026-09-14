import { describe, expect, it } from "vitest";

import { colorPalettes } from "./palettes";

describe("colorPalettes", () => {
  it("assigns a unique ID to every palette", () => {
    const ids = colorPalettes.map((colorPalette) => colorPalette.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("holds at least two colors per palette", () => {
    for (const { id, colors } of colorPalettes) {
      expect(colors.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("holds finite color components", () => {
    for (const { id, colors } of colorPalettes) {
      for (const { r, g, b } of colors) {
        expect([r, g, b].every(Number.isFinite), id).toBe(true);
      }
    }
  });
});
