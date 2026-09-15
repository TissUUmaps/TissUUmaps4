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

  describe("computeRange", () => {
    it("returns the minimum and maximum of plain arrays", async () => {
      await expect(MathUtils.computeRange([3, -1, 7, 2])).resolves.toEqual([
        -1, 7,
      ]);
    });

    it("returns the minimum and maximum of typed arrays", async () => {
      await expect(
        MathUtils.computeRange(new Float32Array([0.5, -2.5, 1.5])),
      ).resolves.toEqual([-2.5, 1.5]);
      await expect(
        MathUtils.computeRange(new Uint8Array([200, 10, 255, 0])),
      ).resolves.toEqual([0, 255]);
    });

    it("returns a degenerate range for a single value", async () => {
      await expect(MathUtils.computeRange([4])).resolves.toEqual([4, 4]);
      await expect(MathUtils.computeRange([4, 4, 4])).resolves.toEqual([4, 4]);
    });

    it("ignores non-finite values", async () => {
      await expect(
        MathUtils.computeRange(
          new Float64Array([NaN, 2, Infinity, 4, -Infinity]),
        ),
      ).resolves.toEqual([2, 4]);
    });

    it("returns the empty range when no finite value is found", async () => {
      await expect(MathUtils.computeRange([])).resolves.toEqual([
        Infinity,
        -Infinity,
      ]);
      await expect(MathUtils.computeRange([NaN, Infinity])).resolves.toEqual([
        Infinity,
        -Infinity,
      ]);
    });

    it("handles large data", async () => {
      const data = new Uint16Array(100_000).map((_, i) => (i % 1000) + 5);
      await expect(MathUtils.computeRange(data)).resolves.toEqual([5, 1004]);
    });

    it("rejects with the reason of an aborted signal", async () => {
      const controller = new AbortController();
      controller.abort(new Error("aborted"));
      await expect(
        MathUtils.computeRange(new Uint8Array(10), {
          signal: controller.signal,
        }),
      ).rejects.toThrow("aborted");
    });
  });

  describe("computeHistogram", () => {
    it("assigns values to the nearest bin over the given range", async () => {
      const { hist, range } = await MathUtils.computeHistogram(
        [0, 1, 2, 3, 4],
        [0, 4],
        5,
      );
      expect(range).toEqual([0, 4]);
      expect(hist).toEqual([1, 1, 1, 1, 1]);
    });

    it("maps the range bounds to the first and last bins", async () => {
      const { hist } = await MathUtils.computeHistogram(
        new Float32Array([-1, -0.9, 0.49, 0.51, 1]),
        [-1, 1],
        3,
      );
      expect(hist).toEqual([2, 1, 2]);
    });

    it("uses 1024 bins by default", async () => {
      const data = new Uint16Array(1024).map((_, i) => i);
      const { hist } = await MathUtils.computeHistogram(data, [0, 1023]);
      expect(hist).toHaveLength(1024);
      expect(hist.every((count) => count === 1)).toBe(true);
    });

    it("counts values outside the range in the edge bins", async () => {
      const { hist } = await MathUtils.computeHistogram(
        [-10, 0, 5, 10, 20],
        [0, 10],
        3,
      );
      expect(hist).toEqual([2, 1, 2]);
    });

    it("ignores non-finite values", async () => {
      const { hist } = await MathUtils.computeHistogram(
        new Float64Array([NaN, 2, Infinity, 4, -Infinity]),
        [2, 4],
        2,
      );
      expect(hist).toEqual([1, 1]);
    });

    it("puts all values into the first bin for a degenerate range", async () => {
      const { hist, range } = await MathUtils.computeHistogram(
        [6, 7, 8],
        [7, 7],
        4,
      );
      expect(range).toEqual([7, 7]);
      expect(hist).toEqual([3, 0, 0, 0]);
    });

    it("puts all values into a single bin", async () => {
      const { hist } = await MathUtils.computeHistogram([1, 5, 9], [1, 9], 1);
      expect(hist).toEqual([3]);
    });

    it("returns zero counts for empty data", async () => {
      await expect(
        MathUtils.computeHistogram([], [0, 255], 3),
      ).resolves.toEqual({ hist: [0, 0, 0], range: [0, 255] });
    });

    it("handles large data", async () => {
      const data = new Uint16Array(100_000).map((_, i) => i % 1000);
      const { hist } = await MathUtils.computeHistogram(data, [0, 999], 1000);
      expect(hist.every((count) => count === 100)).toBe(true);
    });

    it("rejects with the reason of an aborted signal", async () => {
      const controller = new AbortController();
      controller.abort(new Error("aborted"));
      await expect(
        MathUtils.computeHistogram(new Uint8Array(10), [0, 255], 4, {
          signal: controller.signal,
        }),
      ).rejects.toThrow("aborted");
    });
  });
});
