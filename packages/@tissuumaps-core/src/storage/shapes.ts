import type { ShapesDataSource } from "../model/shapes";
import type { ProgressCallback } from "../types/callbacks";
import type { ItemsData, ItemsDataProvider } from "./base";

/**
 * Data provider for shape (polygon) collections
 *
 * @typeParam TShapesDataSource - The data source type this data provider opens
 * @typeParam TShapesData - The {@link ShapesData} type produced by this data
 * provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesDataProvider<
  TShapesDataSource extends ShapesDataSource,
  TShapesData extends ShapesData,
> extends ItemsDataProvider<TShapesDataSource, TShapesData> {}

/**
 * Loaded shape collection data providing geometry access
 */
export interface ShapesData extends ItemsData {
  /**
   * Loads the geometry for all shapes
   *
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the loaded shapes geometry
   */
  loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<ShapesGeometry>;
}

/**
 * Geometry for shapes (multi-polygons) stored in CSR-style format
 *
 * Shapes are organized in a shapes -> polygons -> rings -> vertices structure,
 * using CSR-style offset arrays to define the relationships between these elements.
 * Typed arrays are used for efficient storage and transfer across worker boundaries.
 *
 * - Shape `s` owns polygons `[shapePolygonOffsets[s], shapePolygonOffsets[s+1])`
 * - Polygon `p` owns rings `[polygonRingOffsets[p], polygonRingOffsets[p+1])`
 * - Ring `r` owns vertices `[ringVertexOffsets[r], ringVertexOffsets[r+1])`
 * - Vertex `v` has coordinates at `coords[2*v]` (x) and `coords[2*v + 1]` (y)
 */
export type ShapesGeometry = {
  /**
   * Shape --> polygon offsets
   *
   * Length: number of shapes + 1 (last entry is total polygon count)
   *
   * One entry per shape (multi-polygon), giving the starting polygon index for each shape.
   */
  shapePolygonOffsets: Uint32Array;

  /**
   * Polygon --> ring offsets
   *
   * Length: number of polygons + 1 (last entry is total ring count)
   *
   * One entry per polygon, giving the starting ring index for each polygon; the first ring is the shell, and any subsequent rings are holes.
   */
  polygonRingOffsets: Uint32Array;

  /**
   * Ring --> vertex offsets
   *
   * Length: number of rings + 1 (last entry is total vertex count)
   *
   * One entry per ring, giving the starting vertex index for each ring; the last vertex of a ring is implicitly connected to the first vertex.
   */
  ringVertexOffsets: Uint32Array;

  /**
   * Vertex coordinates
   *
   * Length: 2 * number of vertices
   *
   * Two entries per vertex, giving the x and y coordinates of each vertex; the coordinates of vertex i are at indices 2*i and 2*i + 1 (interleaved).
   */
  coords: Float32Array;
};
