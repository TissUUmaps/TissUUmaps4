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

  describe("packRGBA", () => {
    it("adds the opacity as alpha for a visible item", () => {
      expect(ColorUtils.packRGBA(0x030201, 1, 0xff)).toBe(0xff030201);
    });

    it("yields zero alpha for an invisible item", () => {
      expect(ColorUtils.packRGBA(0x030201, 0, 0xff)).toBe(0x00030201);
    });

    it("discards any existing alpha", () => {
      expect(ColorUtils.packRGBA(0xaa030201, 1, 0x80)).toBe(0x80030201);
      expect(ColorUtils.packRGBA(0xaa030201, 0, 0x80)).toBe(0x00030201);
    });

    it("returns an unsigned 32-bit integer", () => {
      expect(ColorUtils.packRGBA(0xffffff, 1, 0xff)).toBe(0xffffffff);
    });
  });

  describe("packColor", () => {
    it("packs a color to a 24-bit integer", () => {
      expect(ColorUtils.packColor({ r: 1, g: 2, b: 3 })).toBe(
        (3 << 16) | (2 << 8) | 1,
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

  describe("getDefaultChannelColor", () => {
    it("returns fixed colors for the first six channels", () => {
      expect(ColorUtils.getDefaultChannelColor(0)).toEqual({
        r: 255,
        g: 0,
        b: 0,
      });
      expect(ColorUtils.getDefaultChannelColor(1)).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(ColorUtils.getDefaultChannelColor(2)).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
      expect(ColorUtils.getDefaultChannelColor(3)).toEqual({
        r: 255,
        g: 255,
        b: 0,
      });
      expect(ColorUtils.getDefaultChannelColor(4)).toEqual({
        r: 0,
        g: 255,
        b: 255,
      });
      expect(ColorUtils.getDefaultChannelColor(5)).toEqual({
        r: 255,
        g: 0,
        b: 255,
      });
    });

    it("derives further channels from HSB", () => {
      // channel 6: hue 48deg, full saturation and brightness
      expect(ColorUtils.getDefaultChannelColor(6)).toEqual({
        r: 255,
        g: 204,
        b: 0,
      });
      // channel 7: hue 176deg, full saturation and brightness
      expect(ColorUtils.getDefaultChannelColor(7)).toEqual({
        r: 0,
        g: 255,
        b: 238,
      });
      // channel 10: hue 200deg, saturation and brightness 0.95
      expect(ColorUtils.getDefaultChannelColor(10)).toEqual({
        r: 12,
        g: 166,
        b: 242,
      });
    });

    it("wraps around after 100 channels", () => {
      expect(ColorUtils.getDefaultChannelColor(100)).toEqual(
        ColorUtils.getDefaultChannelColor(0),
      );
      expect(ColorUtils.getDefaultChannelColor(107)).toEqual(
        ColorUtils.getDefaultChannelColor(7),
      );
    });

    it("keeps saturation and brightness above 0.5", () => {
      for (let c = 0; c < 100; c++) {
        const { r, g, b } = ColorUtils.getDefaultChannelColor(c);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = max / 255;
        const saturation = (max - min) / max;
        expect(brightness).toBeGreaterThan(0.5);
        expect(saturation).toBeGreaterThan(0.5);
      }
    });

    it("returns integer components within [0, 255] for all channels", () => {
      for (let c = 0; c < 100; c++) {
        const { r, g, b } = ColorUtils.getDefaultChannelColor(c);
        for (const v of [r, g, b]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
        }
      }
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
