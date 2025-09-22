import { describe, expect, it } from "vitest";

import ArrayUtils from "./ArrayUtils";

describe("ArrayUtils.fillSeq", () => {
  it("fills a Float32Array with a repeating sequence", () => {
    const arr = new Float32Array(6);
    ArrayUtils.fillSeq(arr, [1, 2]);
    expect(Array.from(arr)).toEqual([1, 2, 1, 2, 1, 2]);
  });

  it("throws if array length is less than sequence length", () => {
    const arr = new Uint8Array(2);
    expect(() => ArrayUtils.fillSeq(arr, [1, 2, 3])).toThrow(
      "Array length must be a multiple of sequence length",
    );
  });

  it("throws if array length is not a multiple of sequence length", () => {
    const arr = new Float32Array(5);
    expect(() => ArrayUtils.fillSeq(arr, [1, 2])).toThrow(
      "Array length must be a multiple of sequence length",
    );
  });

  it("works with an empty array and empty sequence", () => {
    const arr = new Float32Array(0);
    ArrayUtils.fillSeq(arr, []);
    expect(Array.from(arr)).toEqual([]);
  });

  it("throws if sequence is empty but array is not", () => {
    const arr = new Float32Array(2);
    expect(() => ArrayUtils.fillSeq(arr, [])).toThrow(
      "Array length must be a multiple of sequence length",
    );
  });
});
