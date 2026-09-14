import { describe, expect, it } from "vitest";

import { MathUtils } from "./MathUtils";

describe("MathUtils", () => {
  describe("clamp", () => {
    it("returns value when within range", () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    });

    it("clamps to min when value is below min", () => {
      expect(MathUtils.clamp(-3, 0, 10)).toBe(0);
    });

    it("clamps to max when value is above max", () => {
      expect(MathUtils.clamp(15, 0, 10)).toBe(10);
    });

    it("works with floats", () => {
      expect(MathUtils.clamp(3.7, 1.2, 4.5)).toBeCloseTo(3.7);
      expect(MathUtils.clamp(0.5, 1.2, 4.5)).toBeCloseTo(1.2);
    });

    it("returns the bound when min equals max", () => {
      expect(MathUtils.clamp(2, 5, 5)).toBe(5);
      expect(MathUtils.clamp(7, 5, 5)).toBe(5);
    });
  });

  describe("align", () => {
    it("returns n when n is already a multiple of m", () => {
      expect(MathUtils.align(10, 5)).toBe(10);
      expect(MathUtils.align(0, 5)).toBe(0);
      expect(MathUtils.align(100, 25)).toBe(100);
    });

    it("aligns n to the next multiple of m when not already aligned", () => {
      expect(MathUtils.align(7, 5)).toBe(10);
      expect(MathUtils.align(1, 8)).toBe(8);
      expect(MathUtils.align(33, 16)).toBe(48);
    });

    it("throws error when n is negative", () => {
      expect(() => MathUtils.align(-5, 3)).toThrow("n must be non-negative");
      expect(() => MathUtils.align(-1, 1)).toThrow("n must be non-negative");
    });

    it("throws error when m is zero or negative", () => {
      expect(() => MathUtils.align(5, 0)).toThrow(
        "m must be strictly positive",
      );
      expect(() => MathUtils.align(5, -3)).toThrow(
        "m must be strictly positive",
      );
    });

    it("works with m = 1", () => {
      expect(MathUtils.align(5, 1)).toBe(5);
      expect(MathUtils.align(0, 1)).toBe(0);
    });

    it("works with large numbers", () => {
      expect(MathUtils.align(1000000, 1024)).toBe(1000448);
      expect(MathUtils.align(1000000, 1000000)).toBe(1000000);
    });

    it("aligns to power of 2", () => {
      expect(MathUtils.align(5, 4)).toBe(8);
      expect(MathUtils.align(15, 16)).toBe(16);
      expect(MathUtils.align(256, 512)).toBe(512);
    });
  });
});
