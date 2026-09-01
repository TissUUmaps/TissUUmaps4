import { afterEach, describe, expect, it, vi } from "vitest";

import { AsyncUtils, type Rect, type ShapesGeometry } from "@tissuumaps/core";

import { WebGLShapesRasterizer } from "./WebGLShapesRasterizer";

/** A closed ring, given as a list of `[x, y]` vertices (no repeated first/last) */
type Ring = [number, number][];
/** A polygon: shell ring first, then any hole rings */
type Polygon = Ring[];
/** A (multi-)polygon shape */
type Shape = Polygon[];

/**
 * Assembles a CSR-style {@link ShapesGeometry} from a nested
 * shapes -> polygons -> rings -> vertices description
 */
function createTestGeometry(shapes: Shape[]): ShapesGeometry {
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
function createTestSquare(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Shape {
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

const unitBounds: Rect = { x: 0, y: 0, width: 1, height: 1 };

describe("WebGLShapesRasterizer.createScanlines", () => {
  it("rasterizes a single full-extent square into one scanline", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
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
    const geometry = createTestGeometry([createTestSquare(0, 0, 0.25, 1)]);

    const { scanlines } = await WebGLShapesRasterizer.createScanlines(
      1,
      geometry,
      undefined,
      unitBounds,
    );

    // bins 0..31 -> first word all set, bin 32 -> second word bit 0
    expect(scanlines[0]!.occupancyMask).toEqual([0xffffffff, 0x1, 0x0, 0x0]);
  });

  it("distributes a shape and its edges across multiple scanlines", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        2,
        geometry,
        undefined,
        unitBounds,
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
    const geometry = createTestGeometry([createTestSquare(0, 1, 1, 2)]);

    const { scanlines } = await WebGLShapesRasterizer.createScanlines(
      2,
      geometry,
      undefined,
      { x: 0, y: 0, width: 1, height: 2 },
    );

    const emptyScanline = scanlines[0]!;
    expect(emptyScanline.xMin).toBe(Infinity);
    expect(emptyScanline.xMax).toBe(-Infinity);
    expect(emptyScanline.shapes.size).toBe(0);
    expect(emptyScanline.occupancyMask).toEqual([0, 0, 0, 0]);

    const populatedScanline = scanlines[1]!;
    expect(populatedScanline.shapes.has(0)).toBe(true);
  });

  it("respects the shape mask and compacts the shape index", async () => {
    const geometry = createTestGeometry([
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 1, 1),
    ]);

    const { scanlines, totalNumScanlineShapes } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        [false, true, false],
        unitBounds,
      );

    expect(totalNumScanlineShapes).toBe(1);
    // second shape (masked in) is compacted to index 0
    expect([...scanlines[0]!.shapes.keys()]).toEqual([0]);
  });

  it("assigns ascending compacted indices to multiple included shapes", async () => {
    const geometry = createTestGeometry([
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 1, 1),
    ]);

    const { scanlines, totalNumScanlineShapes } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        [true, false, true],
        unitBounds,
      );

    expect(totalNumScanlineShapes).toBe(2);
    expect([...scanlines[0]!.shapes.keys()]).toEqual([0, 1]);
  });

  it("ignores zero-length edges", async () => {
    // triangle with a repeated vertex introducing a zero-length edge
    const geometry = createTestGeometry([
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
        unitBounds,
      );

    // 4 ring segments, but the zero-length one is dropped
    expect(totalNumScanlineShapeEdges).toBe(3);
    expect(scanlines[0]!.shapes.get(0)!.edges).toHaveLength(3);
  });

  it("includes hole edges but bounds the shape by its shell only", async () => {
    // 4x4 square shell with a 2x2 square hole
    const geometry = createTestGeometry([
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
    const geometry = createTestGeometry([
      [createTestSquare(0, 0, 1, 1)[0]!, createTestSquare(2, 0, 3, 1)[0]!],
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

  it("returns an empty result when there are no scanlines", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        0,
        geometry,
        undefined,
        unitBounds,
      );

    expect(scanlines).toEqual([]);
    expect(totalNumScanlineShapes).toBe(0);
    expect(totalNumScanlineShapeEdges).toBe(0);
  });

  it("rejects object bounds without a positive width or height", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);

    await expect(
      WebGLShapesRasterizer.createScanlines(4, geometry, undefined, {
        x: 0,
        y: 0,
        width: 1,
        height: 0,
      }),
    ).rejects.toThrow("positive width and height");
  });

  it("returns empty scanlines for geometry without shapes", async () => {
    const geometry = createTestGeometry([]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        3,
        geometry,
        undefined,
        unitBounds,
      );

    expect(scanlines).toHaveLength(3);
    expect(totalNumScanlineShapes).toBe(0);
    expect(totalNumScanlineShapeEdges).toBe(0);
    for (const scanline of scanlines) {
      expect(scanline.shapes.size).toBe(0);
      expect(scanline.occupancyMask).toEqual([0, 0, 0, 0]);
    }
  });

  it("returns empty scanlines when every shape is masked out", async () => {
    const geometry = createTestGeometry([
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 1, 1),
    ]);

    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        2,
        geometry,
        [false, false],
        unitBounds,
      );

    expect(totalNumScanlineShapes).toBe(0);
    expect(totalNumScanlineShapeEdges).toBe(0);
    for (const scanline of scanlines) {
      expect(scanline.shapes.size).toBe(0);
      expect(scanline.occupancyMask).toEqual([0, 0, 0, 0]);
    }
  });

  it("rejects when the abort signal is already aborted", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);
    const controller = new AbortController();
    controller.abort();

    await expect(
      WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });

  describe("yielding", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("passes the signal to the yielder once per shape", async () => {
      const geometry = createTestGeometry([
        createTestSquare(0, 0, 1, 1),
        createTestSquare(0, 0, 1, 1),
      ]);
      const controller = new AbortController();
      const maybeYield = vi.fn(() => Promise.resolve());
      vi.spyOn(AsyncUtils, "createYielder").mockReturnValue(maybeYield);

      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
        { signal: controller.signal },
      );

      expect(maybeYield).toHaveBeenCalledTimes(2);
      expect(maybeYield).toHaveBeenCalledWith({ signal: controller.signal });
    });

    it("yields for masked-out shapes as well", async () => {
      const geometry = createTestGeometry([
        createTestSquare(0, 0, 1, 1),
        createTestSquare(0, 0, 1, 1),
      ]);
      const maybeYield = vi.fn(() => Promise.resolve());
      vi.spyOn(AsyncUtils, "createYielder").mockReturnValue(maybeYield);

      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        [false, false],
        unitBounds,
      );

      expect(maybeYield).toHaveBeenCalledTimes(2);
    });

    it("rejects when the signal is aborted mid-iteration", async () => {
      const geometry = createTestGeometry([
        createTestSquare(0, 0, 1, 1),
        createTestSquare(0, 0, 1, 1),
      ]);
      const controller = new AbortController();
      // Abort on the first yield so the second one observes the abort
      const maybeYield = vi.fn((opts?: { signal?: AbortSignal }) => {
        opts?.signal?.throwIfAborted();
        controller.abort();
        return Promise.resolve();
      });
      vi.spyOn(AsyncUtils, "createYielder").mockReturnValue(maybeYield);

      await expect(
        WebGLShapesRasterizer.createScanlines(
          1,
          geometry,
          undefined,
          unitBounds,
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
      expect(maybeYield).toHaveBeenCalledTimes(2);
    });
  });
});

describe("WebGLShapesRasterizer.packScanlines", () => {
  it("packs the header, occupancy, shape header, and edges of a single shape", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
      );

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );

    // header (4) + occupancy (4) + shape header (4) + 4 edges (16) = 28 values
    expect(buffer.byteLength).toBe(28 * 4);
    const uint32Buffer = new Uint32Array(buffer);
    const float32Buffer = new Float32Array(buffer);

    // scanline header (texel 0): pointer, shape count, xMin, xMax
    expect(uint32Buffer[0]).toBe(1); // data block starts right after the 1-texel header
    expect(uint32Buffer[1]).toBe(1); // one shape
    expect(float32Buffer[2]).toBe(0);
    expect(float32Buffer[3]).toBe(1);

    // scanline data block (texel 1): occupancy mask
    expect([
      uint32Buffer[4],
      uint32Buffer[5],
      uint32Buffer[6],
      uint32Buffer[7],
    ]).toEqual([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);

    // shape header (texel 2): shape index, edge count, xMin, xMax
    expect(uint32Buffer[8]).toBe(0);
    expect(uint32Buffer[9]).toBe(4);
    expect(float32Buffer[10]).toBe(0);
    expect(float32Buffer[11]).toBe(1);

    // edges (texels 3..6)
    expect([...float32Buffer.slice(12, 28)]).toEqual([
      0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0,
    ]);
  });

  it("aligns the buffer size to the requested multiple", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
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
    const geometry = createTestGeometry([createTestSquare(0, 1, 1, 2)]);
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
    const uint32Buffer = new Uint32Array(buffer);
    const float32Buffer = new Float32Array(buffer);

    // scanline 0 header (texel 0): points just past the 2-texel header region
    expect(uint32Buffer[0]).toBe(2);
    expect(uint32Buffer[1]).toBe(0); // no shapes
    expect(float32Buffer[2]).toBe(Infinity); // untouched xMin
    expect(float32Buffer[3]).toBe(-Infinity); // untouched xMax

    // scanline 1 header (texel 1): points past scanline 0's data (just its mask)
    expect(uint32Buffer[4]).toBe(3);
    expect(uint32Buffer[5]).toBe(1); // one shape
    expect(float32Buffer[6]).toBe(0);
    expect(float32Buffer[7]).toBe(1);

    // scanline 0 data block (texel 2): empty occupancy mask, no shapes follow
    expect([
      uint32Buffer[8],
      uint32Buffer[9],
      uint32Buffer[10],
      uint32Buffer[11],
    ]).toEqual([0, 0, 0, 0]);
  });

  it("rejects when the abort signal is already aborted", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
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

  it("chains the texel offsets of multiple shapes within one scanline", async () => {
    const geometry = createTestGeometry([
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 0.5, 0.5),
    ]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        1,
        geometry,
        undefined,
        unitBounds,
      );

    const buffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
    );
    const uint32Buffer = new Uint32Array(buffer);
    const float32Buffer = new Float32Array(buffer);

    // header (1) + occupancy (1) + 2 * (shape header (1) + 4 edges) = 12 texels
    expect(uint32Buffer[1]).toBe(2); // two shapes in the scanline

    // first shape header (texel 2), its 4 edges occupy texels 3..6
    expect(uint32Buffer[8]).toBe(0);
    expect(uint32Buffer[9]).toBe(4);
    expect(float32Buffer[10]).toBe(0);
    expect(float32Buffer[11]).toBe(1);

    // second shape header follows at texel 7, bounded by the smaller square
    expect(uint32Buffer[28]).toBe(1);
    expect(uint32Buffer[29]).toBe(4);
    expect(float32Buffer[30]).toBe(0);
    expect(float32Buffer[31]).toBe(0.5);
  });

  it("passes the signal to the yielder once per scanline", async () => {
    const geometry = createTestGeometry([createTestSquare(0, 0, 1, 1)]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        3,
        geometry,
        undefined,
        unitBounds,
      );
    const controller = new AbortController();
    const maybeYield = vi.fn(() => Promise.resolve());
    vi.spyOn(AsyncUtils, "createYielder").mockReturnValue(maybeYield);

    await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { signal: controller.signal },
    );

    expect(maybeYield).toHaveBeenCalledTimes(3);
    expect(maybeYield).toHaveBeenCalledWith({ signal: controller.signal });
    vi.restoreAllMocks();
  });
});

describe("WebGLShapesRasterizer round-trip", () => {
  it("packs a buffer sized to match the scanline totals", async () => {
    const geometry = createTestGeometry([
      createTestSquare(0, 0, 1, 1),
      createTestSquare(0, 0, 0.5, 0.5),
    ]);
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        4,
        geometry,
        undefined,
        unitBounds,
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
