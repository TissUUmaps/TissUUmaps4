import { describe, expect, it } from "vitest";

import type { MultiPolygon, Rect, Vertex } from "../types";
import ShapeUtils from "./ShapeUtils";

describe("ShapeUtils", () => {
  it("getBounds computes bounding rect for a simple square", () => {
    const square: MultiPolygon = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ] as Vertex[],
          holes: [],
        },
      ],
    };
    const bounds: Rect = ShapeUtils.getBounds([square]);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(1);
    expect(bounds.height).toBe(1);
  });

  it("createScanlines assigns edges to expected scanlines for unit square", () => {
    const square: MultiPolygon = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ] as Vertex[],
          holes: [],
        },
      ],
    };
    const objectBounds = { x: 0, y: 0, width: 1, height: 1 };
    const numScanlines = 4;
    const { scanlines, numScanlineShapes, numScanlineShapeEdges } =
      ShapeUtils.createScanlines(numScanlines, [square], objectBounds);

    // Expect one shape per scanline (the single polygon)
    expect(scanlines.length).toBe(numScanlines);
    expect(numScanlineShapes).toBe(4);

    // For this square: bottom horizontal -> scanline 0 only;
    // left & right verticals -> scanlines 0..3; top horizontal excluded.
    // So edges per scanline: [3,2,2,2] -> total 9
    expect(numScanlineShapeEdges).toBe(9);

    // Check per-scanline xMin/xMax and shape edge counts
    const edgeCounts = scanlines.map((s) => {
      const shape = s.shapes.get(0);
      return shape ? shape.edges.length : 0;
    });
    expect(edgeCounts).toEqual([3, 2, 2, 2]);
    for (const s of scanlines) {
      expect(s.xMin).toBe(0);
      expect(s.xMax).toBe(1);
      expect(s.occupancyMask).toEqual([0, 0, 0, 0]);
    }
  });

  it("packScanlines produces a Float32Array with correct layout and headers", () => {
    const square: MultiPolygon = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ] as Vertex[],
          holes: [],
        },
      ],
    };
    const objectBounds = { x: 0, y: 0, width: 1, height: 1 };
    const numScanlines = 4;
    const { scanlines, numScanlineShapes, numScanlineShapeEdges } =
      ShapeUtils.createScanlines(numScanlines, [square], objectBounds);

    const floatData = ShapeUtils.packScanlines(
      scanlines,
      numScanlineShapes,
      numScanlineShapeEdges,
    );

    // Expected length: 8*numScanlines + 4*numScanlineShapes + 4*numScanlineShapeEdges
    const expectedLength =
      8 * numScanlines + 4 * numScanlineShapes + 4 * numScanlineShapeEdges;
    expect(floatData.length).toBe(expectedLength);

    // Inspect first scanline info block:
    // currentScanlineOffset starts at 4 * numScanlines (uint32 words) => 4*4 = 16
    const uint32View = new Uint32Array(floatData.buffer);
    expect(uint32View[0]).toBe(4 * numScanlines); // offset to first scanline block
    expect(uint32View[1]).toBe(1); // shapes.size for first scanline

    // Floats at indices 2 and 3 are xMin and xMax for first scanline
    expect(floatData[2]).toBeCloseTo(0);
    expect(floatData[3]).toBeCloseTo(1);
  });
});
