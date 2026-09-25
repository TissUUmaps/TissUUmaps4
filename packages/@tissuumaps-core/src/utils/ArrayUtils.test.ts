import { describe, expect, it } from "vitest";

import { ArrayUtils } from "./ArrayUtils";

describe("ArrayUtils", () => {
  describe("fromBigIntArray", () => {
    it("converts 64-bit integers to 64-bit floats", () => {
      expect(
        ArrayUtils.fromBigIntArray(
          new BigInt64Array([-(2n ** 53n) + 1n, -1n, 0n, 2n ** 48n]),
        ),
      ).toEqual(new Float64Array([-(2 ** 53) + 1, -1, 0, 2 ** 48]));
      expect(
        ArrayUtils.fromBigIntArray(new BigUint64Array([0n, 2n ** 53n - 1n])),
      ).toEqual(new Float64Array([0, 2 ** 53 - 1]));
    });

    it("throws for values that are not safe integers", () => {
      expect(() =>
        ArrayUtils.fromBigIntArray(new BigInt64Array([2n ** 53n])),
      ).toThrow("Value is not a safe integer: 9007199254740992");
      expect(() =>
        ArrayUtils.fromBigIntArray(new BigUint64Array([2n ** 64n - 1n])),
      ).toThrow("not a safe integer");
    });

    it("handles empty arrays", () => {
      expect(ArrayUtils.fromBigIntArray(new BigInt64Array(0))).toEqual(
        new Float64Array(0),
      );
    });
  });

  describe("toIDArray", () => {
    it("returns integer typed arrays as they are", () => {
      for (const ids of [
        new Int8Array([1, -2]),
        new Int16Array([1, -2]),
        new Int32Array([1, -2]),
        new Uint8Array([1, 2]),
        new Uint8ClampedArray([1, 2]),
        new Uint16Array([1, 2]),
        new Uint32Array([1, 2]),
      ]) {
        expect(ArrayUtils.toIDArray(ids)).toBe(ids);
      }
    });

    it("returns 64-bit float arrays of safe integers as they are", () => {
      const ids = new Float64Array([1, -2, 2 ** 40]);
      expect(ArrayUtils.toIDArray(ids)).toBe(ids);
    });

    it("returns string arrays as they are", () => {
      const ids = ["a", "b"];
      expect(ArrayUtils.toIDArray(ids)).toBe(ids);
    });

    it("copies array-likes of strings into a string array", () => {
      const ids = ArrayUtils.toIDArray({ length: 2, 0: "a", 1: "b" });
      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toEqual(["a", "b"]);
    });

    it("converts 64-bit integer typed arrays to 64-bit floats", () => {
      expect(ArrayUtils.toIDArray(new BigInt64Array([-1n, 2n]))).toEqual(
        new Float64Array([-1, 2]),
      );
      expect(ArrayUtils.toIDArray(new BigUint64Array([1n, 2n ** 40n]))).toEqual(
        new Float64Array([1, 2 ** 40]),
      );
    });

    it("copies integers of other arrays into 64-bit floats", () => {
      expect(ArrayUtils.toIDArray([0, -3, 2 ** 40])).toEqual(
        new Float64Array([0, -3, 2 ** 40]),
      );
      expect(ArrayUtils.toIDArray([1n, -2n])).toEqual(
        new Float64Array([1, -2]),
      );
      expect(ArrayUtils.toIDArray(new Float32Array([1, 2]))).toEqual(
        new Float64Array([1, 2]),
      );
    });

    it("returns an empty unsigned 32-bit integer array for no IDs", () => {
      expect(ArrayUtils.toIDArray([])).toEqual(new Uint32Array(0));
    });

    it("throws for values that are neither strings nor safe integers", () => {
      expect(() => ArrayUtils.toIDArray([1.5, 2])).toThrow(
        "ID is not a safe integer: 1.5",
      );
      expect(() => ArrayUtils.toIDArray(new Float64Array([NaN, 2]))).toThrow(
        "ID is not a safe integer: NaN",
      );
      expect(() => ArrayUtils.toIDArray([1, null])).toThrow(
        "ID is not a safe integer: null",
      );
      expect(() => ArrayUtils.toIDArray([2 ** 53])).toThrow(
        "ID is not a safe integer",
      );
      expect(() => ArrayUtils.toIDArray([2n ** 53n])).toThrow(
        "ID is not a safe integer",
      );
    });

    it("throws for mixed strings and integers", () => {
      expect(() => ArrayUtils.toIDArray([1, "2"])).toThrow(
        "ID is not a safe integer: 2",
      );
      expect(() => ArrayUtils.toIDArray(["1", 2])).toThrow(
        "ID is not a string: 2",
      );
    });
  });
});
