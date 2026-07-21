import { describe, expect, it } from "vitest";

import type { Rect, ShapesGeometry } from "@tissuumaps/core";

import { WebGLShapesRasterizer } from "./WebGLShapesRasterizer";

/** A closed ring, given as a list of `[x, y]` vertices (no repeated first/last) */
type Ring = [number, number][];
/** A polygon: shell ring first, then any hole rings */
type Polygon = Ring[];
/** A (multi-)polygon shape */
type Shape = Polygon[];

/**
 * Assembles a CSR-style {@link ShapesGeometry} from a nested
 * shapes -> polygons -> rings -> vertices description.
 */
function buildGeometry(shapes: Shape[]): ShapesGeometry {
  const shapePolygonOffsets: number[] = [0];
  const polygonRingOffsets: number[] = [0];
  const ringVertexOffsets: number[] = [0];
  const coords: number[] = [];
  for (const shape of shapes) {
    for (const polygon of shape) {
      for (const ring of polygon) {
        for (const [x, y] of ring) {
          coords.push(x, y);
        }
        ringVertexOffsets.push(coords.length / 2);
      }
      polygonRingOffsets.push(ringVertexOffsets.length - 1);
    }
    shapePolygonOffsets.push(polygonRingOffsets.length - 1);
  }
  return {
    shapePolygonOffsets: new Uint32Array(shapePolygonOffsets),
    polygonRingOffsets: new Uint32Array(polygonRingOffsets),
    ringVertexOffsets: new Uint32Array(ringVertexOffsets),
    coords: new Float32Array(coords),
  };
}

/** An axis-aligned square `[x0, x1] x [y0, y1]` as a single-ring polygon shape */
function square(x0: number, y0: number, x1: number, y1: number): Shape {
  return [
    [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    ],
  ];
}

const UNIT_BOUNDS: Rect = { x: 0, y: 0, width: 1, height: 1 };

describe("WebGLShapesRasterizer.createScanlines", () => {
  it("rasterizes a single full-extent square into one scanline", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    expect(scanlines).toHaveLength(1);
    expect(totalNumScanlineShapes).toBe(1);
    expect(totalNumScanlineShapeEdges).toBe(4);

    const scanline = scanlines[0]!;
    expect(scanline.xMin).toBe(0);
    expect(scanline.xMax).toBe(1);
    // full horizontal extent -> every occupancy bit set
    expect(scanline.occupancyMask).toEqual([
      0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff,
    ]);

    expect([...scanline.shapes.keys()]).toEqual([0]);
    const scanlineShape = scanline.shapes.get(0)!;
    expect(scanlineShape.xMin).toBe(0);
    expect(scanlineShape.xMax).toBe(1);
    expect(scanlineShape.edges).toEqual([
      { v0x: 0, v0y: 0, v1x: 1, v1y: 0 },
      { v0x: 1, v0y: 0, v1x: 1, v1y: 1 },
      { v0x: 1, v0y: 1, v1x: 0, v1y: 1 },
      { v0x: 0, v0y: 1, v1x: 0, v1y: 0 },
    ]);
  });

  it("sets only the occupancy bins covered by a partial-width shape", async () => {
    // square covering the left quarter -> bins [0, 32]
    const geometry = buildGeometry([square(0, 0, 0.25, 1)]);

    const { scanlines } = await WebGLShapesRasterizer.createScanlines(
      1,
      geometry,
      undefined,
      UNIT_BOUNDS,
    );

    // bins 0..31 -> first word all set, bin 32 -> second word bit 0
    expect(scanlines[0]!.occupancyMask).toEqual([0xffffffff, 0x1, 0x0, 0x0]);
  });

  it("distributes a shape and its edges across multiple scanlines", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        2,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    expect(scanlines).toHaveLength(2);
    // the shape spans both scanlines -> one shape entry per scanline
    expect(totalNumScanlineShapes).toBe(2);
    // vertical edges straddle both scanlines, horizontal edges only one each
    expect(totalNumScanlineShapeEdges).toBe(6);

    expect(scanlines[0]!.shapes.get(0)!.edges).toHaveLength(3);
    expect(scanlines[1]!.shapes.get(0)!.edges).toHaveLength(3);
  });

  it("leaves scanlines outside a shape's vertical extent empty", async () => {
    // square occupying only the top half of a 2-unit-tall object
    const geometry = buildGeometry([square(0, 1, 1, 2)]);

    const { scanlines } = await WebGLShapesRasterizer.createScanlines(
      2,
      geometry,
      undefined,
      { x: 0, y: 0, width: 1, height: 2 },
    );

    const empty = scanlines[0]!;
    expect(empty.xMin).toBe(Infinity);
    expect(empty.xMax).toBe(-Infinity);
    expect(empty.shapes.size).toBe(0);
    expect(empty.occupancyMask).toEqual([0, 0, 0, 0]);

    const populated = scanlines[1]!;
    expect(populated.shapes.has(0)).toBe(true);
  });

  it("respects the shape mask and compacts the shape index", async () => {
    const geometry = buildGeometry([
      square(0, 0, 1, 1),
      square(0, 0, 1, 1),
      square(0, 0, 1, 1),
    ]);

    const { scanlines, totalNumScanlineShapes } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        [false, true, false],
        UNIT_BOUNDS,
      );

    expect(totalNumScanlineShapes).toBe(1);
    // second shape (masked in) is compacted to index 0
    expect([...scanlines[0]!.shapes.keys()]).toEqual([0]);
  });

  it("assigns ascending compacted indices to multiple included shapes", async () => {
    const geometry = buildGeometry([
      square(0, 0, 1, 1),
      square(0, 0, 1, 1),
      square(0, 0, 1, 1),
    ]);

    const { scanlines, totalNumScanlineShapes } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        [true, false, true],
        UNIT_BOUNDS,
      );

    expect(totalNumScanlineShapes).toBe(2);
    expect([...scanlines[0]!.shapes.keys()]).toEqual([0, 1]);
  });

  it("ignores zero-length edges", async () => {
    // triangle with a repeated vertex introducing a zero-length edge
    const geometry = buildGeometry([
      [
        [
          [
            [0, 0],
            [1, 0],
            [1, 0], // duplicate -> zero-length edge
            [0, 1],
          ],
        ],
      ],
    ]);

    const { totalNumScanlineShapeEdges, scanlines } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    // 4 ring segments, but the zero-length one is dropped
    expect(totalNumScanlineShapeEdges).toBe(3);
    expect(scanlines[0]!.shapes.get(0)!.edges).toHaveLength(3);
  });

  it("includes hole edges but bounds the shape by its shell only", async () => {
    // 4x4 square shell with a 2x2 square hole
    const geometry = buildGeometry([
      [
        [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
          ],
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
          ],
        ],
      ],
    ]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(1, geometry, undefined, {
        x: 0,
        y: 0,
        width: 4,
        height: 4,
      });

    expect(totalNumScanlineShapes).toBe(1);
    // shell (4 edges) + hole (4 edges)
    expect(totalNumScanlineShapeEdges).toBe(8);

    const scanlineShape = scanlines[0]!.shapes.get(0)!;
    expect(scanlineShape.edges).toHaveLength(8);
    // bounds come from the shell, ignoring the hole
    expect(scanlineShape.xMin).toBe(0);
    expect(scanlineShape.xMax).toBe(4);
  });

  it("merges polygons of a multi-polygon shape under one shape index", async () => {
    const geometry = buildGeometry([
      [square(0, 0, 1, 1)[0]!, square(2, 0, 3, 1)[0]!],
    ]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(1, geometry, undefined, {
        x: 0,
        y: 0,
        width: 3,
        height: 1,
      });

    expect(totalNumScanlineShapes).toBe(1);
    expect(totalNumScanlineShapeEdges).toBe(8);

    const scanlineShape = scanlines[0]!.shapes.get(0)!;
    // bounds span both polygons
    expect(scanlineShape.xMin).toBe(0);
    expect(scanlineShape.xMax).toBe(3);
    expect(scanlineShape.edges).toHaveLength(8);
  });

  it("returns empty scanlines for geometry without shapes", async () => {
    const geometry = buildGeometry([]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        3,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    expect(scanlines).toHaveLength(3);
    expect(totalNumScanlineShapes).toBe(0);
    expect(totalNumScanlineShapeEdges).toBe(0);
    for (const scanline of scanlines) {
      expect(scanline.shapes.size).toBe(0);
      expect(scanline.occupancyMask).toEqual([0, 0, 0, 0]);
    }
  });

  it("rejects when the abort signal is already aborted", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);
    const controller = new AbortController();
    controller.abort();

    await expect(
      WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });
});

describe("WebGLShapesRasterizer.packScanlines", () => {
  it("packs the header, occupancy, shape header, and edges of a single shape", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );

    // header (4) + occupancy (4) + shape header (4) + 4 edges (16) = 28 values
    expect(buffer.byteLength).toBe(28 * 4);
    const u32 = new Uint32Array(buffer);
    const f32 = new Float32Array(buffer);

    // scanline header (texel 0): pointer, shape count, xMin, xMax
    expect(u32[0]).toBe(1); // data block starts right after the 1-texel header
    expect(u32[1]).toBe(1); // one shape
    expect(f32[2]).toBe(0);
    expect(f32[3]).toBe(1);

    // scanline data block (texel 1): occupancy mask
    expect([u32[4], u32[5], u32[6], u32[7]]).toEqual([
      0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff,
    ]);

    // shape header (texel 2): shape index, edge count, xMin, xMax
    expect(u32[8]).toBe(0);
    expect(u32[9]).toBe(4);
    expect(f32[10]).toBe(0);
    expect(f32[11]).toBe(1);

    // edges (texels 3..6)
    expect([...f32.slice(12, 28)]).toEqual([
      0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0,
    ]);
  });

  it("aligns the buffer size to the requested multiple", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { align: 16 },
    );

    // 28 values aligned up to the next multiple of 16 -> 32 values
    expect(buffer.byteLength).toBe(32 * 4);
    // padding is left zero-initialized
    expect([...new Uint32Array(buffer).slice(28, 32)]).toEqual([0, 0, 0, 0]);
  });

  it("writes per-scanline pointers and empty-scanline headers", async () => {
    // square in the top half so scanline 0 is empty and scanline 1 is populated
    const geometry = buildGeometry([square(0, 1, 1, 2)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(2, geometry, undefined, {
        x: 0,
        y: 0,
        width: 1,
        height: 2,
      });

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );
    const u32 = new Uint32Array(buffer);
    const f32 = new Float32Array(buffer);

    // scanline 0 header (texel 0): points just past the 2-texel header region
    expect(u32[0]).toBe(2);
    expect(u32[1]).toBe(0); // no shapes
    expect(f32[2]).toBe(Infinity); // untouched xMin
    expect(f32[3]).toBe(-Infinity); // untouched xMax

    // scanline 1 header (texel 1): points past scanline 0's data (just its mask)
    expect(u32[4]).toBe(3);
    expect(u32[5]).toBe(1); // one shape
    expect(f32[6]).toBe(0);
    expect(f32[7]).toBe(1);

    // scanline 0 data block (texel 2): empty occupancy mask, no shapes follow
    expect([u32[8], u32[9], u32[10], u32[11]]).toEqual([0, 0, 0, 0]);
  });

  it("rejects when the abort signal is already aborted", async () => {
    const geometry = buildGeometry([square(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );
    const controller = new AbortController();
    controller.abort();

    await expect(
      WebGLShapesRasterizer.packScanlines(
        scanlines,
        totalNumScanlineShapes,
        totalNumScanlineShapeEdges,
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });
});

describe("WebGLShapesRasterizer round-trip", () => {
  it("packs a buffer sized to match the scanline totals", async () => {
    const geometry = buildGeometry([
      square(0, 0, 1, 1),
      square(0, 0, 0.5, 0.5),
    ]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        4,
        geometry,
        undefined,
        UNIT_BOUNDS,
      );

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );

    // per-scanline: header texel (4) + occupancy texel (4);
    // plus one texel (4) per shape entry and per edge entry
    const expectedValues =
      8 * scanlines.length +
      4 * totalNumScanlineShapes +
      4 * totalNumScanlineShapeEdges;
    expect(buffer.byteLength).toBe(expectedValues * 4);
  });
});
