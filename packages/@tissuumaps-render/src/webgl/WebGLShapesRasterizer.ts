import {
  AsyncUtils,
  MathUtils,
  type Rect,
  type ShapesGeometry,
} from "@tissuumaps/core";

/** A single horizontal scanline containing shape intersection data */
export type Scanline = {
  /** Minimum X coordinate across the bounding boxes of the shapes on this scanline */
  xMin: number;
  /** Maximum X coordinate across the bounding boxes of the shapes on this scanline */
  xMax: number;
  /** Per-shape intersection data, keyed by shape index */
  shapes: Map<number, ScanlineShape>;
  /** 128-bit bitmask for fast horizontal skip-testing in the fragment shader */
  occupancyMask: ScanlineOccupancyMask;
};

/** Per-shape data within a single scanline */
export type ScanlineShape = {
  /** Minimum X coordinate of this shape within the scanline */
  xMin: number;
  /** Maximum X coordinate of this shape within the scanline */
  xMax: number;
  /** Polygon edges that intersect this scanline */
  edges: ScanlineShapeEdge[];
};

/** A polygon edge intersecting a scanline, defined by its two endpoints */
export type ScanlineShapeEdge = {
  /** X coordinate of the first endpoint */
  v0x: number;
  /** Y coordinate of the first endpoint */
  v0y: number;
  /** X coordinate of the second endpoint */
  v1x: number;
  /** Y coordinate of the second endpoint */
  v1y: number;
};

/**
 * A 128-bit occupancy mask stored as four 32-bit integers
 *
 * Each bit stands for one of 128 equally wide bins across the object's bounding
 * box, and is set if any shape on the scanline covers that bin.
 */
export type ScanlineOccupancyMask = [number, number, number, number];

/**
 * Rasterizes shapes into the scanline data consumed by the shapes shaders
 *
 * Shapes are not triangulated. Instead, the fragment shader determines per
 * fragment which shape it falls into, by computing a winding number over the
 * polygon edges near that fragment. To keep that affordable, the object's
 * bounding box is divided into horizontal scanlines, and each scanline holds
 * only the shapes and edges that reach into it: {@link createScanlines}
 * rasterizes them, {@link packScanlines} lays them out for the GPU.
 *
 * All coordinates are in data coordinates, as is the fragment shader.
 */
export class WebGLShapesRasterizer {
  /**
   * Rasterizes shapes into horizontal scanlines
   *
   * Divides `objectBounds` into `numScanlines` horizontal bands, and assigns
   * each shape to the bands spanned by the bounding box of its polygon shells,
   * and each edge to the bands spanned by its own bounding box. Both are
   * conservative: a shape or edge may be assigned to bands it does not actually
   * reach into, but never to too few. Per band, it also builds a 128-bit
   * occupancy mask, which lets the fragment shader skip fragments early.
   *
   * Shapes are identified by their index among the *included* shapes, i.e.
   * `shapesMask` compacts the indices. Holes contribute their edges, but not
   * their bounds, as a shape is bounded by the shells of its polygons only.
   *
   * Yields between shapes, i.e. long-running rasterizations neither block the
   * event loop nor ignore an abort for long.
   *
   * @param numScanlines - Number of horizontal scanlines
   * @param geometry - Geometry for all shapes in the object
   * @param shapesMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param objectBounds - Bounding box of all shapes
   * @param options - Optional abort signal
   * @returns Scanlines with per-shape edges, and total counts for buffer sizing.
   * Without scanlines, there is nothing to rasterize into, and the result is empty
   * @throws If `objectBounds` has a non-positive width or height, as shapes
   * cannot be rasterized into a degenerate bounding box
   */
  static async createScanlines(
    numScanlines: number,
    geometry: ShapesGeometry,
    shapesMask: Uint8Array | undefined,
    objectBounds: Rect,
    options?: { signal?: AbortSignal },
  ): Promise<{
    scanlines: Scanline[];
    totalNumScanlineShapes: number;
    totalNumScanlineShapeEdges: number;
  }> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (objectBounds.width <= 0 || objectBounds.height <= 0) {
      throw new Error("Object bounds must have a positive width and height");
    }
    if (numScanlines < 1) {
      return {
        scanlines: [],
        totalNumScanlineShapes: 0,
        totalNumScanlineShapeEdges: 0,
      };
    }
    const {
      shapePolygonOffsets,
      polygonRingOffsets,
      ringVertexOffsets,
      coords,
    } = geometry;
    const scanlines: Scanline[] = Array.from({ length: numScanlines }, () => ({
      xMin: Infinity,
      xMax: -Infinity,
      shapes: new Map<number, ScanlineShape>(),
      occupancyMask: [0, 0, 0, 0],
    }));
    let totalNumScanlineShapes = 0;
    let totalNumScanlineShapeEdges = 0;
    const maybeYield = AsyncUtils.createYielder();
    let shapeIndex = 0; // compacted index over included shapes
    for (let s = 0; s < shapePolygonOffsets.length - 1; s++) {
      if (shapesMask === undefined || shapesMask[s]! > 0) {
        const shapePolygonStart = shapePolygonOffsets[s]!;
        const shapePolygonEnd = shapePolygonOffsets[s + 1]!;
        for (let p = shapePolygonStart; p < shapePolygonEnd; p++) {
          const polygonRingStart = polygonRingOffsets[p]!;
          const polygonRingEnd = polygonRingOffsets[p + 1]!;
          // compute shape xMin/xMax/occupancy mask
          let xMin = Infinity,
            yMin = Infinity,
            xMax = -Infinity,
            yMax = -Infinity;
          const shellVertexStart = ringVertexOffsets[polygonRingStart]!;
          const shellVertexEnd = ringVertexOffsets[polygonRingStart + 1]!;
          for (let v = shellVertexStart; v < shellVertexEnd; v++) {
            const x = coords[2 * v]!;
            const y = coords[2 * v + 1]!;
            xMin = Math.min(xMin, x);
            yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x);
            yMax = Math.max(yMax, y);
          }
          const firstScanlineIndex = MathUtils.clamp(
            Math.floor(
              (numScanlines * (yMin - objectBounds.y)) / objectBounds.height,
            ),
            0,
            numScanlines - 1,
          );
          const lastScanlineIndex = MathUtils.clamp(
            Math.ceil(
              (numScanlines * (yMax - objectBounds.y)) / objectBounds.height,
            ),
            0,
            numScanlines - 1,
          );
          const firstOccupancyMaskBin = MathUtils.clamp(
            Math.floor((128 * (xMin - objectBounds.x)) / objectBounds.width),
            0,
            127,
          );
          const lastOccupancyMaskBin = MathUtils.clamp(
            Math.ceil((128 * (xMax - objectBounds.x)) / objectBounds.width),
            0,
            127,
          );
          for (
            let scanlineIndex = firstScanlineIndex;
            scanlineIndex <= lastScanlineIndex;
            scanlineIndex++
          ) {
            const scanline = scanlines[scanlineIndex]!;
            scanline.xMin = Math.min(scanline.xMin, xMin);
            scanline.xMax = Math.max(scanline.xMax, xMax);
            // TODO Compute per-scanline occupancy mask bin ranges for better precision
            // (i.e. accurately rasterize shapes instead of just their bounding boxes).
            // Also, consider rasterizing holes (temporary per-shape occupancy masks).
            for (
              let occupancyMaskBin = firstOccupancyMaskBin;
              occupancyMaskBin <= lastOccupancyMaskBin;
              occupancyMaskBin++
            ) {
              const occupancyMaskIndex = occupancyMaskBin >> 5;
              scanline.occupancyMask[occupancyMaskIndex] = MathUtils.safeOr(
                scanline.occupancyMask[occupancyMaskIndex]!,
                MathUtils.safeLeftShift(1, occupancyMaskBin & 0x1f),
              );
            }
            const scanlineShape = scanline.shapes.get(shapeIndex);
            if (scanlineShape === undefined) {
              scanline.shapes.set(shapeIndex, { xMin, xMax, edges: [] });
              totalNumScanlineShapes++;
            } else {
              scanlineShape.xMin = Math.min(scanlineShape.xMin, xMin);
              scanlineShape.xMax = Math.max(scanlineShape.xMax, xMax);
            }
          }
          // add shape edges to scanlines
          for (let r = polygonRingStart; r < polygonRingEnd; r++) {
            const ringVertexStart = ringVertexOffsets[r]!;
            const ringVertexEnd = ringVertexOffsets[r + 1]!;
            const nRingVertices = ringVertexEnd - ringVertexStart;
            for (let i = 0; i < nRingVertices; ++i) {
              const v0 = ringVertexStart + ((i + 0) % nRingVertices);
              const v1 = ringVertexStart + ((i + 1) % nRingVertices);
              const v0x = coords[2 * v0]!;
              const v0y = coords[2 * v0 + 1]!;
              const v1x = coords[2 * v1]!;
              const v1y = coords[2 * v1 + 1]!;
              if (v0x === v1x && v0y === v1y) {
                continue; // ignore zero-length edges
              }
              const firstEdgeScanlineIndex = MathUtils.clamp(
                Math.floor(
                  (numScanlines * (Math.min(v0y, v1y) - objectBounds.y)) /
                    objectBounds.height,
                ),
                0,
                numScanlines - 1,
              );
              const lastEdgeScanlineIndex = MathUtils.clamp(
                Math.ceil(
                  (numScanlines * (Math.max(v0y, v1y) - objectBounds.y)) /
                    objectBounds.height,
                ),
                0,
                numScanlines - 1,
              );
              for (
                let scanlineIndex = firstEdgeScanlineIndex;
                scanlineIndex <= lastEdgeScanlineIndex;
                scanlineIndex++
              ) {
                const scanline = scanlines[scanlineIndex]!;
                const scanlineShape = scanline.shapes.get(shapeIndex)!;
                scanlineShape.edges.push({ v0x, v0y, v1x, v1y });
                totalNumScanlineShapeEdges++;
              }
            }
          }
        }
        shapeIndex++;
      }
      await maybeYield({ signal });
    }
    return { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges };
  }

  /**
   * Packs scanline data into a flat {@link ArrayBuffer} suitable for
   * uploading as an RGBA32F texture
   *
   * Values are grouped into texels of four 32-bit values, and every offset is a
   * texel offset:
   * - a header of one texel per scanline: data offset, shape count, xMin, xMax
   * - per scanline: one texel holding the occupancy mask, followed, per shape,
   *   by one texel of shape index, edge count, xMin and xMax, and one texel per
   *   edge
   *
   * The shapes fragment shader documents the same layout, and is the authority
   * on it.
   *
   * @param scanlines - Rasterized scanlines from {@link createScanlines}
   * @param totalNumScanlineShapes - Total shape entries across all scanlines, as
   * returned by {@link createScanlines}
   * @param totalNumScanlineShapeEdges - Total edge entries across all scanlines,
   * as returned by {@link createScanlines}
   * @param options - Optional abort signal and alignment, in 32-bit values, to
   * pad the buffer to (used to fill whole texture lines)
   * @returns The packed buffer
   */
  static async packScanlines(
    scanlines: Scanline[],
    totalNumScanlineShapes: number,
    totalNumScanlineShapeEdges: number,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<ArrayBuffer> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const buffer = new ArrayBuffer(
      MathUtils.align(
        4 * scanlines.length + // header -> scanline info S
          4 * scanlines.length + // scanline S -> scanline header
          4 * totalNumScanlineShapes + // scanline S -> shape P -> shape header
          4 * totalNumScanlineShapeEdges, // scanline S -> shape P -> edge E
        align,
      ) * 4, // 4 bytes per 32-bit value
    );
    const float32Buffer = new Float32Array(buffer);
    const uint32Buffer = new Uint32Array(buffer);
    let currentScanlineTexelOffset = scanlines.length;
    const maybeYield = AsyncUtils.createYielder();
    for (let s = 0; s < scanlines.length; s++) {
      const scanline = scanlines[s]!;
      // header
      uint32Buffer.set(
        [currentScanlineTexelOffset, scanline.shapes.size],
        4 * s,
      );
      float32Buffer.set([scanline.xMin, scanline.xMax], 4 * s + 2);
      // scanline
      uint32Buffer.set(scanline.occupancyMask, 4 * currentScanlineTexelOffset);
      let currentScanlineShapeTexelOffset = currentScanlineTexelOffset + 1;
      for (const [shapeIndex, scanlineShape] of scanline.shapes) {
        // scanline shape
        uint32Buffer.set(
          [shapeIndex, scanlineShape.edges.length],
          4 * currentScanlineShapeTexelOffset,
        );
        float32Buffer.set(
          [scanlineShape.xMin, scanlineShape.xMax],
          4 * currentScanlineShapeTexelOffset + 2,
        );
        let currentScanlineShapeEdgeTexelOffset =
          currentScanlineShapeTexelOffset + 1;
        for (const scanlineShapeEdge of scanlineShape.edges) {
          // scanline shape edge
          float32Buffer.set(
            [
              scanlineShapeEdge.v0x,
              scanlineShapeEdge.v0y,
              scanlineShapeEdge.v1x,
              scanlineShapeEdge.v1y,
            ],
            4 * currentScanlineShapeEdgeTexelOffset,
          );
          currentScanlineShapeEdgeTexelOffset++;
        }
        currentScanlineShapeTexelOffset = currentScanlineShapeEdgeTexelOffset;
      }
      currentScanlineTexelOffset = currentScanlineShapeTexelOffset;
      await maybeYield({ signal });
    }
    return buffer;
  }
}
