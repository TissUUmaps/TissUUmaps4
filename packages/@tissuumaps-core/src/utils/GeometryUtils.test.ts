import { describe, expect, it } from "vitest";

import type { Rect } from "../types/geometry";
import { GeometryUtils } from "./GeometryUtils";

describe("GeometryUtils.boundingBox", () => {
  it("returns null when no rectangles are provided", () => {
    expect(GeometryUtils.boundingBox()).toBeNull();
  });

  it("returns the same rectangle when a single rectangle is provided", () => {
    const rect: Rect = { x: 1, y: 2, width: 3, height: 4 };
    expect(GeometryUtils.boundingBox(rect)).toEqual(rect);
  });

  it("computes the union of two disjoint rectangles", () => {
    const a: Rect = { x: 0, y: 0, width: 2, height: 2 };
    const b: Rect = { x: 5, y: 5, width: 3, height: 1 };
    expect(GeometryUtils.boundingBox(a, b)).toEqual({
      x: 0,
      y: 0,
      width: 8,
      height: 6,
    });
  });

  it("computes the union of overlapping rectangles", () => {
    const a: Rect = { x: 0, y: 0, width: 4, height: 4 };
    const b: Rect = { x: 2, y: 2, width: 4, height: 4 };
    expect(GeometryUtils.boundingBox(a, b)).toEqual({
      x: 0,
      y: 0,
      width: 6,
      height: 6,
    });
  });

  it("returns the enclosing rectangle when one contains the other", () => {
    const outer: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const inner: Rect = { x: 2, y: 3, width: 4, height: 4 };
    expect(GeometryUtils.boundingBox(outer, inner)).toEqual(outer);
    expect(GeometryUtils.boundingBox(inner, outer)).toEqual(outer);
  });

  it("computes the union of more than two rectangles", () => {
    const a: Rect = { x: 1, y: 1, width: 2, height: 2 };
    const b: Rect = { x: -3, y: 4, width: 1, height: 1 };
    const c: Rect = { x: 5, y: -2, width: 2, height: 3 };
    expect(GeometryUtils.boundingBox(a, b, c)).toEqual({
      x: -3,
      y: -2,
      width: 10,
      height: 7,
    });
  });

  it("handles negative coordinates", () => {
    const a: Rect = { x: -5, y: -5, width: 2, height: 2 };
    const b: Rect = { x: -1, y: -1, width: 1, height: 1 };
    expect(GeometryUtils.boundingBox(a, b)).toEqual({
      x: -5,
      y: -5,
      width: 5,
      height: 5,
    });
  });

  it("handles zero-sized rectangles", () => {
    const a: Rect = { x: 2, y: 3, width: 0, height: 0 };
    const b: Rect = { x: 4, y: 5, width: 0, height: 0 };
    expect(GeometryUtils.boundingBox(a, b)).toEqual({
      x: 2,
      y: 3,
      width: 2,
      height: 2,
    });
  });
});

describe("GeometryUtils.dimsEquals", () => {
  it("returns true for equal dimensions", () => {
    expect(
      GeometryUtils.dimsEquals(
        { width: 10, height: 20 },
        { width: 10, height: 20 },
      ),
    ).toBe(true);
  });

  it("returns false when width differs", () => {
    expect(
      GeometryUtils.dimsEquals(
        { width: 10, height: 20 },
        { width: 11, height: 20 },
      ),
    ).toBe(false);
  });

  it("returns false when height differs", () => {
    expect(
      GeometryUtils.dimsEquals(
        { width: 10, height: 20 },
        { width: 10, height: 21 },
      ),
    ).toBe(false);
  });

  it("ignores extra properties such as x and y", () => {
    expect(
      GeometryUtils.dimsEquals(
        { x: 1, y: 2, width: 10, height: 20 } as never,
        { x: 3, y: 4, width: 10, height: 20 } as never,
      ),
    ).toBe(true);
  });
});

describe("GeometryUtils.rectEquals", () => {
  it("returns true for equal rectangles", () => {
    expect(
      GeometryUtils.rectEquals(
        { x: 1, y: 2, width: 3, height: 4 },
        { x: 1, y: 2, width: 3, height: 4 },
      ),
    ).toBe(true);
  });

  it("returns false when x differs", () => {
    expect(
      GeometryUtils.rectEquals(
        { x: 1, y: 2, width: 3, height: 4 },
        { x: 9, y: 2, width: 3, height: 4 },
      ),
    ).toBe(false);
  });

  it("returns false when y differs", () => {
    expect(
      GeometryUtils.rectEquals(
        { x: 1, y: 2, width: 3, height: 4 },
        { x: 1, y: 9, width: 3, height: 4 },
      ),
    ).toBe(false);
  });

  it("returns false when width differs", () => {
    expect(
      GeometryUtils.rectEquals(
        { x: 1, y: 2, width: 3, height: 4 },
        { x: 1, y: 2, width: 9, height: 4 },
      ),
    ).toBe(false);
  });

  it("returns false when height differs", () => {
    expect(
      GeometryUtils.rectEquals(
        { x: 1, y: 2, width: 3, height: 4 },
        { x: 1, y: 2, width: 3, height: 9 },
      ),
    ).toBe(false);
  });
});
