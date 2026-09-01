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

    it("parses an 8-bit palette with maxValue 255", () => {
      const str = "0 0 0\n128 64 32\n255 255 255";
      const result = ColorUtils.parseColorPalette(str, {
        sep: " ",
        maxValue: 255,
      });
      expect(result).toEqual([
        { r: 0, g: 0, b: 0 },
        { r: 128, g: 64, b: 32 },
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
      expect(result).toHaveLength(2);
    });

    it("parses a single color line", () => {
      const result = ColorUtils.parseColorPalette("0.5 0.5 0.5");
      expect(result).toEqual([{ r: 127.5, g: 127.5, b: 127.5 }]);
    });
  });

  describe("packColor", () => {
    it("packs a color to a 24-bit integer", () => {
      expect(ColorUtils.packColor({ r: 1, g: 2, b: 3 })).toBe(
        (1 << 16) | (2 << 8) | 3,
      );
    });

    it("packs white", () => {
      expect(ColorUtils.packColor({ r: 255, g: 255, b: 255 })).toBe(0xffffff);
    });

    it("packs black", () => {
      expect(ColorUtils.packColor({ r: 0, g: 0, b: 0 })).toBe(0x000000);
    });
  });

  describe("fromHex", () => {
    it("converts hex to color", () => {
      expect(ColorUtils.fromHex("#010203")).toEqual({ r: 1, g: 2, b: 3 });
    });

    it("handles mixed case", () => {
      expect(ColorUtils.fromHex("#aaBBcc")).toEqual({ r: 170, g: 187, b: 204 });
    });

    it("throws on missing hash prefix", () => {
      expect(() => ColorUtils.fromHex("010203")).toThrow(/Invalid hex color/);
    });

    it("throws on non-hex characters", () => {
      expect(() => ColorUtils.fromHex("#GGHHII")).toThrow(/Invalid hex color/);
    });

    it("throws on wrong length", () => {
      expect(() => ColorUtils.fromHex("#FFF")).toThrow(/Invalid hex color/);
    });
  });

  describe("toHex", () => {
    it("converts color to hex", () => {
      expect(ColorUtils.toHex({ r: 1, g: 2, b: 3 })).toBe("#010203");
    });

    it("rounds fractional components", () => {
      expect(ColorUtils.toHex({ r: 1.4, g: 2.6, b: 3.5 })).toBe("#010304");
    });

    it("converts white to #ffffff", () => {
      expect(ColorUtils.toHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
    });

    it("converts black to #000000", () => {
      expect(ColorUtils.toHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    });
  });

  describe("colorsEqual", () => {
    it("returns true for identical colors", () => {
      expect(
        ColorUtils.colorsEqual({ r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 3 }),
      ).toBe(true);
    });

    it("returns false when a component differs", () => {
      expect(
        ColorUtils.colorsEqual({ r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 4 }),
      ).toBe(false);
      expect(
        ColorUtils.colorsEqual({ r: 1, g: 2, b: 3 }, { r: 1, g: 9, b: 3 }),
      ).toBe(false);
      expect(
        ColorUtils.colorsEqual({ r: 1, g: 2, b: 3 }, { r: 9, g: 2, b: 3 }),
      ).toBe(false);
    });

    it("compares fractional components exactly", () => {
      expect(
        ColorUtils.colorsEqual(
          { r: 127.5, g: 0, b: 0 },
          { r: 127.5, g: 0, b: 0 },
        ),
      ).toBe(true);
      expect(
        ColorUtils.colorsEqual(
          { r: 127.5, g: 0, b: 0 },
          { r: 128, g: 0, b: 0 },
        ),
      ).toBe(false);
    });

    it("returns true for the same object", () => {
      const color = { r: 10, g: 20, b: 30 };
      expect(ColorUtils.colorsEqual(color, color)).toBe(true);
    });
  });

  describe("fromHex / toHex roundtrip", () => {
    it.each(["#000000", "#ffffff", "#1a2b3c", "#ff8800"])(
      "roundtrips %s",
      (hex) => {
        expect(ColorUtils.toHex(ColorUtils.fromHex(hex))).toBe(hex);
      },
    );
  });
});
