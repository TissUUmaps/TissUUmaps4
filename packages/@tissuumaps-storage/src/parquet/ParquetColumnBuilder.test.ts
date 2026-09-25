import { describe, expect, it } from "vitest";

import { ParquetColumnBuilder } from "./ParquetColumnBuilder";

function build(
  chunks: Parameters<ParquetColumnBuilder["addChunk"]>[0][],
  numRows: number,
) {
  const builder = new ParquetColumnBuilder(numRows);
  let rowStart = 0;
  for (const chunk of chunks) {
    builder.addChunk(chunk, rowStart);
    rowStart += chunk.length;
  }
  return builder.build();
}

describe("ParquetColumnBuilder", () => {
  it("writes typed chunks of one type into a fresh array of that type", () => {
    const first = new Int32Array([1, 2]);
    const values = build([first, new Int32Array([3])], 3);
    expect(values).toEqual(new Int32Array([1, 2, 3]));
    expect(values).not.toBe(first);
  });

  it("converts 64-bit integer chunks to 64-bit floats", () => {
    expect(
      build([new BigInt64Array([-1n, 2n]), new BigInt64Array([2n ** 48n])], 3),
    ).toEqual(new Float64Array([-1, 2, 2 ** 48]));
    expect(build([new BigUint64Array([1n, 2n ** 40n])], 2)).toEqual(
      new Float64Array([1, 2 ** 40]),
    );
  });

  it("turns a typed column into 64-bit floats when a plain chunk follows", () => {
    expect(build([new Int32Array([1, 2]), [3, null]], 4)).toEqual(
      new Float64Array([1, 2, 3, NaN]),
    );
    expect(build([new Int32Array([1]), [null, null]], 3)).toEqual(
      new Float64Array([1, NaN, NaN]),
    );
  });

  it("turns a typed column into 64-bit floats when another type follows", () => {
    expect(build([new Int32Array([1]), new Float32Array([2.5])], 2)).toEqual(
      new Float64Array([1, 2.5]),
    );
    expect(build([new Int32Array([1]), new BigInt64Array([2n])], 2)).toEqual(
      new Float64Array([1, 2]),
    );
  });

  it("writes plain chunks of numbers and bigints as 64-bit floats", () => {
    expect(build([[1.5, null], new Float64Array([2.5])], 3)).toEqual(
      new Float64Array([1.5, NaN, 2.5]),
    );
    expect(build([[1n, -2n, null], new BigInt64Array([3n])], 4)).toEqual(
      new Float64Array([1, -2, NaN, 3]),
    );
    expect(build([[1, 2]], 2)).toEqual(new Float64Array([1, 2]));
  });

  it("keeps leading nulls of a numeric column as NaN", () => {
    expect(build([[null, null], [1]], 3)).toEqual(
      new Float64Array([NaN, NaN, 1]),
    );
    expect(build([[null], new Int32Array([1])], 2)).toEqual(
      new Float64Array([NaN, 1]),
    );
  });

  it("throws for 64-bit integers that are not safe integers", () => {
    expect(() => build([[2n ** 53n]], 1)).toThrow("not a safe integer");
    expect(() => build([new BigUint64Array([2n ** 64n - 1n])], 1)).toThrow(
      "not a safe integer",
    );
  });

  it("collects other values into a plain array", () => {
    expect(build([["a", null], ["b"]], 3)).toEqual(["a", null, "b"]);
    expect(build([[null, null]], 2)).toEqual([null, null]);
  });

  it("accepts chunks in any order, also across a promotion", () => {
    const builder = new ParquetColumnBuilder(4);
    builder.addChunk(new Int32Array([3, 4]), 2);
    builder.addChunk([1, null], 0);
    expect(builder.build()).toEqual(new Float64Array([1, NaN, 3, 4]));
  });

  it("keeps rows no chunk covers as NaN or null", () => {
    const numbers = new ParquetColumnBuilder(3);
    numbers.addChunk([1], 1);
    expect(numbers.build()).toEqual(new Float64Array([NaN, 1, NaN]));
    const strings = new ParquetColumnBuilder(3);
    strings.addChunk(["a"], 1);
    expect(strings.build()).toEqual([null, "a", null]);
  });

  it("builds a column of nulls without chunks", () => {
    expect(build([], 2)).toEqual([null, null]);
    expect(build([], 0)).toEqual([]);
  });
});
