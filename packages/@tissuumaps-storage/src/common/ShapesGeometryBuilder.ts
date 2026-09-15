import type { Geometry, Position } from "geojson";

import type { ShapesGeometry } from "@tissuumaps/core";

/**
 * Accumulator building a {@link ShapesGeometry} from GeoJSON geometries
 *
 * Shapes are appended one by one and the CSR offset arrays are grown as they
 * are, so the geometries of a file can be consumed as they are decoded.
 */
export class ShapesGeometryBuilder {
  private readonly _shapePolygonOffsets: number[] = [0];
  private readonly _polygonRingOffsets: number[] = [0];
  private readonly _ringVertexOffsets: number[] = [0];
  private readonly _coords: number[] = [];

  /**
   * Appends a geometry as one shape
   *
   * Polygons and multi-polygons are appended; every other geometry type is
   * skipped, as are polygons without a valid shell and rings with fewer than
   * three vertices.
   *
   * @param geometry - The geometry to append
   * @returns Whether a shape was appended
   */
  addGeometry(geometry: Geometry): boolean {
    let polygons: Position[][][];
    if (geometry.type === "Polygon") {
      polygons = [geometry.coordinates];
    } else if (geometry.type === "MultiPolygon") {
      polygons = geometry.coordinates;
    } else {
      console.warn(`Unsupported geometry type: ${geometry.type}`);
      return false;
    }
    let polygonsAdded = false;
    for (const rings of polygons) {
      if (rings.length === 0 || rings[0]!.length < 3) {
        console.warn("Skipping polygon without a valid shell.");
        continue;
      }
      let ringsAdded = false;
      for (const ring of rings) {
        if (ring.length < 3) {
          console.warn("Skipping invalid ring with fewer than three vertices.");
          continue;
        }
        for (const pos of ring) {
          this._coords.push(pos[0]!, pos[1]!);
        }
        this._ringVertexOffsets.push(this._coords.length / 2);
        ringsAdded = true;
      }
      if (!ringsAdded) {
        console.warn("Skipping polygon without valid rings.");
        continue;
      }
      this._polygonRingOffsets.push(this._ringVertexOffsets.length - 1);
      polygonsAdded = true;
    }
    if (!polygonsAdded) {
      return false;
    }
    this._shapePolygonOffsets.push(this._polygonRingOffsets.length - 1);
    return true;
  }

  /**
   * Builds the geometry of the shapes appended so far
   *
   * @returns The shapes geometry, in typed arrays ready to be transferred
   */
  build(): ShapesGeometry {
    return {
      shapePolygonOffsets: new Uint32Array(this._shapePolygonOffsets),
      polygonRingOffsets: new Uint32Array(this._polygonRingOffsets),
      ringVertexOffsets: new Uint32Array(this._ringVertexOffsets),
      coords: new Float32Array(this._coords),
    };
  }
}
