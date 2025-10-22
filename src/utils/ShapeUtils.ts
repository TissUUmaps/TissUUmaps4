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
    numScanlineShapes: number;
    numScanlineShapeEdges: number;
  } {
    const scanlines: Scanline[] = Array.from({ length: numScanlines }, () => ({
      xMin: Infinity,
      xMax: -Infinity,
      shapes: new Map<number, ScanlineShape>(),
      occupancyMask: [0, 0, 0, 0],
    }));
    let numScanlineShapes = 0,
      numScanlineShapeEdges = 0;
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
            const yMin = Math.min(v0.y, v1.y);
            const yMax = Math.max(v0.y, v1.y);
            const yMinNorm = (yMin - objectBounds.y) / objectBounds.height;
            const yMaxNorm = (yMax - objectBounds.y) / objectBounds.height;
            const firstScanlineIndex = Math.max(
              Math.floor(numScanlines * yMinNorm),
              0,
            );
            const lastScanlineIndex = Math.min(
              Math.ceil(numScanlines * yMaxNorm),
              numScanlines - 1,
            );
            for (
              let scanlineIndex = firstScanlineIndex;
              scanlineIndex <= lastScanlineIndex;
              scanlineIndex++
            ) {
              const scanline = scanlines[scanlineIndex]!;
              scanline.xMin = Math.min(scanline.xMin, v0.x, v1.x);
              scanline.xMax = Math.max(scanline.xMax, v0.x, v1.x);
              // TODO update scanline occupancy mask
              const scanlineShape = scanline.shapes.get(shapeIndex);
              const scanlineShapeEdge: ScanlineShapeEdge = { v0, v1 };
              if (scanlineShape === undefined) {
                const newScanlineShape: ScanlineShape = {
                  xMin: Math.min(v0.x, v1.x),
                  xMax: Math.max(v0.x, v1.x),
                  edges: [scanlineShapeEdge],
                };
                scanline.shapes.set(shapeIndex, newScanlineShape);
                numScanlineShapes++;
              } else {
                scanlineShape.xMin = Math.min(scanlineShape.xMin, v0.x, v1.x);
                scanlineShape.xMax = Math.max(scanlineShape.xMax, v0.x, v1.x);
                scanlineShape.edges.push(scanlineShapeEdge);
              }
              numScanlineShapeEdges++;
            }
          }
        }
      }
    }
    return { scanlines, numScanlineShapes, numScanlineShapeEdges };
  }

  static packScanlines(
    scanlines: Scanline[],
    numScanlineShapes: number,
    numScanlineShapeEdges: number,
  ): Float32Array {
    const scanlineDataLength =
      8 * scanlines.length + // scanline infos and headers
      4 * numScanlineShapes + // scanline shape headers
      4 * numScanlineShapeEdges; // scanline shape edges
    const scanlineData = new Float32Array(scanlineDataLength);
    const uint32ScanlineDataView = new Uint32Array(scanlineData.buffer);
    let currentScanlineInfoOffset = 0;
    let currentScanlineOffset = 4 * scanlines.length;
    for (const scanline of scanlines) {
      // scanline info
      uint32ScanlineDataView.set(
        [currentScanlineOffset, scanline.shapes.size],
        currentScanlineInfoOffset,
      );
      scanlineData.set(
        [scanline.xMin, scanline.xMax],
        currentScanlineInfoOffset + 2,
      );
      currentScanlineInfoOffset += 4;
      // scanline header/occupancy mask
      uint32ScanlineDataView.set(scanline.occupancyMask, currentScanlineOffset);
      // scanline shapes
      let currentScanlineShapeOffset = currentScanlineOffset + 4;
      for (const [shapeIndex, scanlineShape] of scanline.shapes) {
        // scanline shape header
        uint32ScanlineDataView.set(
          [shapeIndex, scanlineShape.edges.length],
          currentScanlineShapeOffset,
        );
        scanlineData.set(
          [scanlineShape.xMin, scanlineShape.xMax],
          currentScanlineShapeOffset + 2,
        );
        // scanline shape edges
        let currentScanlineShapeEdgeOffset = currentScanlineShapeOffset + 4;
        for (const scanlineShapeEdge of scanlineShape.edges) {
          // scanline shape edge
          scanlineData.set(
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
    return scanlineData;
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
