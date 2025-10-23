import { MultiPolygon, Rect, Vertex } from "../types";

export default class ShapeUtils {
  static getBounds(multiPolygons: MultiPolygon[]): Rect {
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (const multiPolygon of multiPolygons) {
      for (const polygon of multiPolygon.polygons) {
        for (const path of [polygon.shell, ...polygon.holes]) {
          for (const vertex of path) {
            xMin = Math.min(xMin, vertex.x);
            yMin = Math.min(yMin, vertex.y);
            xMax = Math.max(xMax, vertex.x);
            yMax = Math.max(yMax, vertex.y);
          }
        }
      }
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }

  static createScanlines(
    numScanlines: number,
    multiPolygons: MultiPolygon[],
    objectBounds: Rect,
  ): {
    scanlines: Scanline[];
    totalNumScanlineShapes: number;
    totalNumScanlineShapeEdges: number;
  } {
    const { x: bx, y: by, width: bw, height: bh } = objectBounds;
    const scanlines: Scanline[] = Array.from({ length: numScanlines }, () => ({
      xMin: Infinity,
      xMax: -Infinity,
      shapes: new Map<number, ScanlineShape>(),
      occupancyMask: [0, 0, 0, 0],
    }));
    let totalNumScanlineShapes = 0,
      totalNumScanlineShapeEdges = 0;
    for (let shapeIndex = 0; shapeIndex < multiPolygons.length; shapeIndex++) {
      for (const polygon of multiPolygons[shapeIndex]!.polygons) {
        for (const path of [polygon.shell, ...polygon.holes]) {
          if (path.length < 3) {
            continue; // not a valid polygon
          }
          for (let vertexIndex = 0; vertexIndex < path.length; vertexIndex++) {
            const v0 = path[(vertexIndex + 0) % path.length]!;
            const v1 = path[(vertexIndex + 1) % path.length]!;
            if (v0.x === v1.x && v0.y === v1.y) {
              continue; // ignore zero-length edges
            }
            const xMin = Math.min(v0.x, v1.x);
            const xMax = Math.max(v0.x, v1.x);
            const yMin = Math.min(v0.y, v1.y);
            const yMax = Math.max(v0.y, v1.y);
            const xMinNorm = Math.min(Math.max(0.0, (xMin - bx) / bw), 1.0);
            const xMaxNorm = Math.min(Math.max(0.0, (xMax - bx) / bw), 1.0);
            const yMinNorm = Math.min(Math.max(0.0, (yMin - by) / bh), 1.0);
            const yMaxNorm = Math.min(Math.max(0.0, (yMax - by) / bh), 1.0);
            const firstBin = Math.max(0, Math.floor(128.0 * xMinNorm));
            const lastBin = Math.min(Math.ceil(128.0 * xMaxNorm), 127);
            const firstScanlineIndex = Math.max(
              0,
              Math.floor(numScanlines * yMinNorm),
            );
            const lastScanlineIndex = Math.min(
              Math.ceil(numScanlines * yMaxNorm),
              numScanlines - 1,
            );
            for (let s = firstScanlineIndex; s <= lastScanlineIndex; s++) {
              const scanline = scanlines[s]!;
              scanline.xMin = Math.min(scanline.xMin, v0.x, v1.x);
              scanline.xMax = Math.max(scanline.xMax, v0.x, v1.x);
              for (let bin = firstBin; bin <= lastBin; bin++) {
                // bitwise operators coerce operands to signed 32-bit integers,
                // so we need to use the unsigned right shift operator >>> 0
                // to convert large results back to unsigned 32-bit integers
                scanline.occupancyMask[bin >> 5]! |= (1 << (bin & 0x1f)) >>> 0;
                scanline.occupancyMask[bin >> 5]! >>>= 0;
              }
              const scanlineShape = scanline.shapes.get(shapeIndex);
              if (scanlineShape === undefined) {
                scanline.shapes.set(shapeIndex, {
                  xMin,
                  xMax,
                  edges: [{ v0, v1 }],
                });
                totalNumScanlineShapes++;
              } else {
                scanlineShape.xMin = Math.min(scanlineShape.xMin, xMin);
                scanlineShape.xMax = Math.max(scanlineShape.xMax, xMax);
                scanlineShape.edges.push({ v0, v1 });
              }
              totalNumScanlineShapeEdges++;
            }
          }
        }
      }
    }
    return { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges };
  }

  static packScanlines(
    scanlines: Scanline[],
    totalNumScanlineShapes: number,
    totalNumScanlineShapeEdges: number,
    options: { paddingMultiple?: number } = {},
  ): ArrayBuffer {
    const { paddingMultiple } = options;
    let dataLength =
      4 * scanlines.length + // header -> scanline info S
      4 * scanlines.length + // scanline S -> scanline header
      4 * totalNumScanlineShapes + // scanline S -> shape P -> shape header
      4 * totalNumScanlineShapeEdges; // scanline S -> shape P -> edge E
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const buffer = new ArrayBuffer(4 * dataLength); // 4 bytes per 32-bit value
    const float32Data = new Float32Array(buffer);
    const uint32Data = new Uint32Array(buffer);
    let currentScanlineInfoOffset = 0,
      currentScanlineOffset = 4 * scanlines.length;
    for (const scanline of scanlines) {
      // scanline info
      uint32Data.set(
        [currentScanlineOffset, scanline.shapes.size],
        currentScanlineInfoOffset,
      );
      float32Data.set(
        [scanline.xMin, scanline.xMax],
        currentScanlineInfoOffset + 2,
      );
      currentScanlineInfoOffset += 4;
      // scanline
      uint32Data.set(scanline.occupancyMask, currentScanlineOffset);
      let currentScanlineShapeOffset = currentScanlineOffset + 4;
      for (const [shapeIndex, scanlineShape] of scanline.shapes) {
        // scanline shape
        uint32Data.set(
          [shapeIndex, scanlineShape.edges.length],
          currentScanlineShapeOffset,
        );
        float32Data.set(
          [scanlineShape.xMin, scanlineShape.xMax],
          currentScanlineShapeOffset + 2,
        );
        let currentScanlineShapeEdgeOffset = currentScanlineShapeOffset + 4;
        for (const scanlineShapeEdge of scanlineShape.edges) {
          // scanline shape edge
          float32Data.set(
            [
              scanlineShapeEdge.v0.x,
              scanlineShapeEdge.v0.y,
              scanlineShapeEdge.v1.x,
              scanlineShapeEdge.v1.y,
            ],
            currentScanlineShapeEdgeOffset,
          );
          currentScanlineShapeEdgeOffset += 4;
        }
        currentScanlineShapeOffset = currentScanlineShapeEdgeOffset;
      }
      currentScanlineOffset = currentScanlineShapeOffset;
    }
    return buffer;
  }
}

export type Scanline = {
  xMin: number;
  xMax: number;
  shapes: Map<number, ScanlineShape>;
  occupancyMask: ScanlineOccupancyMask;
};

export type ScanlineShape = {
  xMin: number;
  xMax: number;
  edges: ScanlineShapeEdge[];
};

export type ScanlineShapeEdge = {
  v0: Vertex;
  v1: Vertex;
};

export type ScanlineOccupancyMask = [number, number, number, number];
