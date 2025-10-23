import { describe, expect, it } from "vitest";

import ShapeUtils from "./ShapeUtils";

describe("ShapeUtils", () => {
  it("getBounds computes correct bounding rect for a simple triangle", () => {
    const triangle = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 5 },
          ],
          holes: [],
        },
      ],
    };
    const bounds = ShapeUtils.getBounds([triangle]);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(10);
    expect(bounds.height).toBe(5);
  });

  it("createScanlines produces scanlines and shapes and packScanlines encodes them consistently", () => {
    const triangle = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 5 },
          ],
          holes: [],
        },
      ],
    };

    const bounds = ShapeUtils.getBounds([triangle]);
    const numScanlines = 4;
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      ShapeUtils.createScanlines(numScanlines, [triangle], bounds);

    expect(scanlines.length).toBe(numScanlines);
    expect(totalNumScanlineShapes).toBeGreaterThanOrEqual(1);
    expect(totalNumScanlineShapeEdges).toBeGreaterThanOrEqual(1);

    const buffer = ShapeUtils.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );

    const f = new Float32Array(buffer);
    const u = new Uint32Array(buffer);

    // For each scanline info entry, verify header fields and that the packed scanline
    // contents match the original scanline object stored in memory.
    for (let i = 0; i < scanlines.length; i++) {
      const infoBase = i * 4;
      const scanlineOffset = u[infoBase]!;
      const shapesCount = u[infoBase + 1]!;
      const xMinPacked = f[infoBase + 2]!;
      const xMaxPacked = f[infoBase + 3]!;

      const scanline = scanlines[i]!;
      // xMin/xMax were written as float32
      expect(xMinPacked).toBeCloseTo(scanline.xMin, 5);
      expect(xMaxPacked).toBeCloseTo(scanline.xMax, 5);

      // parse the scanline header at offset (offset is in 32-bit words)
      const occ0 = u[scanlineOffset]!;
      const occ1 = u[scanlineOffset + 1]!;
      const occ2 = u[scanlineOffset + 2]!;
      const occ3 = u[scanlineOffset + 3]!;
      expect([occ0, occ1, occ2, occ3]).toEqual(scanline.occupancyMask);

      // Now parse shapes written after the occupancy mask
      let ptr = scanlineOffset + 4;
      // shapesCount should equal scanline.shapes.size
      expect(shapesCount).toBe(scanline.shapes.size);

      // There may be 0 or more shapes. Iterate shapesCount and compare values.
      for (let s = 0; s < shapesCount; s++) {
        const shapeIndexPacked = u[ptr]!;
        const edgesCountPacked = u[ptr + 1]!;
        const shapeXMinPacked = f[ptr + 2]!;
        const shapeXMaxPacked = f[ptr + 3]!;
        ptr += 4;

        const scanlineShape = scanline.shapes.get(shapeIndexPacked)!;
        // shape must exist in the original
        expect(scanlineShape).toBeDefined();
        expect(shapeXMinPacked).toBeCloseTo(scanlineShape.xMin, 5);
        expect(shapeXMaxPacked).toBeCloseTo(scanlineShape.xMax, 5);
        expect(edgesCountPacked).toBe(scanlineShape.edges.length);

        // compare each edge's floats
        for (let e = 0; e < edgesCountPacked; e++) {
          const v0x = f[ptr]!;
          const v0y = f[ptr + 1]!;
          const v1x = f[ptr + 2]!;
          const v1y = f[ptr + 3]!;
          ptr += 4;

          const edge = scanlineShape.edges[e]!;
          expect(v0x).toBeCloseTo(edge.v0.x, 5);
          expect(v0y).toBeCloseTo(edge.v0.y, 5);
          expect(v1x).toBeCloseTo(edge.v1.x, 5);
          expect(v1y).toBeCloseTo(edge.v1.y, 5);
        }
      }
    }
  });

  it("packScanlines respects paddingMultiple so buffer.byteLength is a multiple of 4*paddingMultiple", () => {
    const triangle = {
      polygons: [
        {
          shell: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 5 },
          ],
          holes: [],
        },
      ],
    };
    const bounds = ShapeUtils.getBounds([triangle]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      ShapeUtils.createScanlines(3, [triangle], bounds);

    const paddingMultiple = 8;
    const buffer = ShapeUtils.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { paddingMultiple },
    );
    expect(buffer.byteLength % (4 * paddingMultiple)).toBe(0);
  });
});
