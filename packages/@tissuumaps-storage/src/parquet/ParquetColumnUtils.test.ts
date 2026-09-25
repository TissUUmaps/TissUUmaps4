import { describe, expect, it } from "vitest";

import { ParquetColumnUtils } from "./ParquetColumnUtils";

describe("ParquetColumnUtils", () => {
  describe("assembleColumn", () => {
    it("concatenates typed chunks of one type into a fresh array", () => {
      const first = new Int32Array([1, 2]);
      const second = new Int32Array([3]);
      const values = ParquetColumnUtils.assembleColumn(
        [
          { data: first, rowStart: 0 },
          { data: second, rowStart: 2 },
        ],
        3,
      );
      expect(values).toEqual(new Int32Array([1, 2, 3]));
      expect(values).not.toBe(first);
    });

    it("converts 64-bit integer typed chunks to 64-bit floats", () => {
      expect(
        ParquetColumnUtils.assembleColumn(
          [
            { data: new BigInt64Array([-1n, 2n]), rowStart: 0 },
            { data: new BigInt64Array([2n ** 48n]), rowStart: 2 },
          ],
          3,
        ),
      ).toEqual(new Float64Array([-1, 2, 2 ** 48]));
      expect(
        ParquetColumnUtils.assembleColumn(
          [{ data: new BigUint64Array([1n, 2n ** 40n]), rowStart: 0 }],
          2,
        ),
      ).toEqual(new Float64Array([1, 2 ** 40]));
    });

    it("converts plain bigint chunks to 64-bit floats", () => {
      expect(
        ParquetColumnUtils.assembleColumn(
          [
            { data: [1n, -2n, null], rowStart: 0 },
            { data: new BigInt64Array([3n]), rowStart: 3 },
          ],
          4,
        ),
      ).toEqual(new Float64Array([1, -2, NaN, 3]));
    });

    it("throws for 64-bit integers that are not safe integers", () => {
      expect(() =>
        ParquetColumnUtils.assembleColumn(
          [{ data: [2n ** 53n], rowStart: 0 }],
          1,
        ),
      ).toThrow("not a safe integer");
      expect(() =>
        ParquetColumnUtils.assembleColumn(
          [{ data: new BigUint64Array([2n ** 64n - 1n]), rowStart: 0 }],
          1,
        ),
      ).toThrow("not a safe integer");
    });

    it("assembles numbers with nulls as 64-bit floats with NaN", () => {
      expect(
        ParquetColumnUtils.assembleColumn(
          [
            { data: [1.5, null], rowStart: 0 },
            { data: new Float64Array([2.5]), rowStart: 2 },
          ],
          3,
        ),
      ).toEqual(new Float64Array([1.5, NaN, 2.5]));
    });

    it("assembles plain number chunks without nulls as 64-bit floats", () => {
      expect(
        ParquetColumnUtils.assembleColumn([{ data: [1, 2], rowStart: 0 }], 2),
      ).toEqual(new Float64Array([1, 2]));
    });

    it("keeps the rows missing from the chunks as NaN", () => {
      expect(
        ParquetColumnUtils.assembleColumn([{ data: [1], rowStart: 1 }], 3),
      ).toEqual(new Float64Array([NaN, 1, NaN]));
    });

    it("assembles other values as a plain array", () => {
      expect(
        ParquetColumnUtils.assembleColumn(
          [
            { data: ["a", null], rowStart: 0 },
            { data: ["b"], rowStart: 2 },
          ],
          3,
        ),
      ).toEqual(["a", null, "b"]);
    });

    it("keeps the rows missing from the chunks as null", () => {
      expect(
        ParquetColumnUtils.assembleColumn([{ data: ["a"], rowStart: 1 }], 3),
      ).toEqual([null, "a", null]);
    });

    it("assembles a column without values as a plain array", () => {
      expect(
        ParquetColumnUtils.assembleColumn(
          [{ data: [null, null], rowStart: 0 }],
          2,
        ),
      ).toEqual([null, null]);
      expect(ParquetColumnUtils.assembleColumn([], 0)).toEqual([]);
    });
  });
});
