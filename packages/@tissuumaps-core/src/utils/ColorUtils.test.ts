import { describe, expect, it } from "vitest";

import { ColorUtils } from "./ColorUtils";

describe("ColorUtils", () => {
  describe("parseColorPalette", () => {
    it("parses a simple color palette with default separator and maxValue", () => {
      const str = "0 0 0\n1 1 1";
      const result = ColorUtils.parseColorPalette(str);
      expect(result).toEqual([
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      ]);
    });

    it("parses a color palette with custom separator and maxValue", () => {
      const str = "0,0,0\n0.5,0.5,0.5\n1,1,1";
      const result = ColorUtils.parseColorPalette(str, {
        sep: ",",
        maxValue: 1,
      });
      expect(result).toEqual([
        { r: 0, g: 0, b: 0 },
        { r: 127.5, g: 127.5, b: 127.5 },
        { r: 255, g: 255, b: 255 },
      ]);
    });

    it("throws on invalid line", () => {
      const str = "0 0\n1 1 1";
      expect(() => ColorUtils.parseColorPalette(str)).toThrow(
        /Invalid color palette line 0/,
      );
    });

    it("ignores empty lines", () => {
      const str = "\n0 0 0\n\n1 1 1\n";
      const result = ColorUtils.parseColorPalette(str);
      expect(result.length).toBe(2);
    });
  });

  describe("parseColor", () => {
    it("parses hex color", () => {
      expect(ColorUtils.parseColor("#ff00aa")).toEqual({
        r: 255,
        g: 0,
        b: 170,
      });
    });

    it("parses rgb() color", () => {
      expect(ColorUtils.parseColor("rgb(10,20,30)")).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
    });

    it("throws on invalid color string", () => {
      expect(() => ColorUtils.parseColor("notacolor")).toThrow(
        /Invalid color string/,
      );
      expect(() => ColorUtils.parseColor("#fff")).toThrow(
        /Invalid color string/,
      );
      expect(() => ColorUtils.parseColor("rgb(1,2)")).toThrow(
        /Invalid color string/,
      );
    });
  });

  describe("packColor", () => {
    it("packs a color to a number", () => {
      expect(ColorUtils.packColor({ r: 1, g: 2, b: 3 })).toBe(
        (1 << 16) | (2 << 8) | 3,
      );
    });

    it("packs white color", () => {
      expect(ColorUtils.packColor({ r: 255, g: 255, b: 255 })).toBe(0xffffff);
    });

    it("packs black color", () => {
      expect(ColorUtils.packColor({ r: 0, g: 0, b: 0 })).toBe(0x000000);
    });
  });
});
