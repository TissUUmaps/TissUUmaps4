import { describe, expect, it } from "vitest";

import { RenderUtils } from "./RenderUtils";

describe("RenderUtils", () => {
  describe("getDefaultChannelColor", () => {
    it("returns fixed colors for the first six channels", () => {
      expect(RenderUtils.getDefaultChannelColor(0)).toEqual({
        r: 255,
        g: 0,
        b: 0,
      });
      expect(RenderUtils.getDefaultChannelColor(1)).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(RenderUtils.getDefaultChannelColor(2)).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
      expect(RenderUtils.getDefaultChannelColor(3)).toEqual({
        r: 255,
        g: 255,
        b: 0,
      });
      expect(RenderUtils.getDefaultChannelColor(4)).toEqual({
        r: 0,
        g: 255,
        b: 255,
      });
      expect(RenderUtils.getDefaultChannelColor(5)).toEqual({
        r: 255,
        g: 0,
        b: 255,
      });
    });

    it("derives further channels from HSB", () => {
      // channel 6: hue 48deg, full saturation and brightness
      expect(RenderUtils.getDefaultChannelColor(6)).toEqual({
        r: 255,
        g: 204,
        b: 0,
      });
      // channel 7: hue 176deg, full saturation and brightness
      expect(RenderUtils.getDefaultChannelColor(7)).toEqual({
        r: 0,
        g: 255,
        b: 238,
      });
      // channel 10: hue 200deg, saturation and brightness 0.95
      expect(RenderUtils.getDefaultChannelColor(10)).toEqual({
        r: 12,
        g: 166,
        b: 242,
      });
    });

    it("wraps around after 100 channels", () => {
      expect(RenderUtils.getDefaultChannelColor(100)).toEqual(
        RenderUtils.getDefaultChannelColor(0),
      );
      expect(RenderUtils.getDefaultChannelColor(107)).toEqual(
        RenderUtils.getDefaultChannelColor(7),
      );
    });

    it("keeps saturation and brightness above 0.5", () => {
      for (let c = 0; c < 100; c++) {
        const { r, g, b } = RenderUtils.getDefaultChannelColor(c);
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
        const { r, g, b } = RenderUtils.getDefaultChannelColor(c);
        for (const v of [r, g, b]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
        }
      }
    });
  });

  describe("getDataTypeRange", () => {
    it.each([
      [new Uint8Array(1), [0, 255]],
      [new Uint16Array(1), [0, 65535]],
      [new Uint32Array(1), [0, 4294967295]],
      [new Int8Array(1), [-128, 127]],
      [new Int16Array(1), [-32768, 32767]],
      [new Int32Array(1), [-2147483648, 2147483647]],
    ])("returns the full integer range of %o", (values, range) => {
      expect(RenderUtils.getDataTypeRange(values)).toEqual(range);
    });

    it.each([new Float32Array(1), new Float64Array(1)])(
      "returns [0, 1] for %o",
      (values) => {
        expect(RenderUtils.getDataTypeRange(values)).toEqual([0, 1]);
      },
    );

    it("returns the 8-bit range for plain arrays", () => {
      expect(RenderUtils.getDataTypeRange([1, 2, 3])).toEqual([0, 255]);
    });
  });
});
