import { describe, expect, it } from "vitest";

import { compressScrollRange } from "./scrollCompression";

describe("compressScrollRange", () => {
  it("lays content that fits out at its own size", () => {
    expect(compressScrollRange(5000, 200, 10000)).toEqual({
      layoutSize: 5000,
      factor: 1,
    });
  });

  it("lays content at the limit out at its own size", () => {
    expect(compressScrollRange(10000, 200, 10000)).toEqual({
      layoutSize: 10000,
      factor: 1,
    });
  });

  it("compresses content beyond the limit onto the limit", () => {
    const { layoutSize, factor } = compressScrollRange(100200, 200, 10200);
    expect(layoutSize).toBe(10200);
    expect(factor).toBe(10);
  });

  it("maps the end of the layout onto the end of the content", () => {
    const contentSize = 180_000_000;
    const viewportSize = 200;
    const { layoutSize, factor } = compressScrollRange(
      contentSize,
      viewportSize,
      10_000_000,
    );
    const maxLayoutOffset = layoutSize - viewportSize;
    expect(maxLayoutOffset * factor).toBeCloseTo(contentSize - viewportSize);
  });

  it("does not compress a viewport larger than the limit", () => {
    expect(compressScrollRange(5000, 300, 200)).toEqual({
      layoutSize: 5000,
      factor: 1,
    });
  });
});
