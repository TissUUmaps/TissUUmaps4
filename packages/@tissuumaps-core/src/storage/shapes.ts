import { type MultiPolygon, type ProgressCallback } from "../types";
import { type DataLoader, type ItemsData } from "./base";

/**
 * Data loader for shape (polygon) collections
 *
 * @typeParam TShapesData - The concrete {@link ShapesData} type produced by this loader
 */
export interface ShapesDataLoader<
  TShapesData extends ShapesData,
> extends DataLoader {
  /**
   * Loads the shapes data from the configured data source
   *
   * @param options - Optional abort signal and progress callback
   * @returns The loaded shapes data
   */
  loadShapes: (options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }) => Promise<TShapesData>;
}

/**
 * Loaded shape collection data providing multi-polygon geometry access
 */
export interface ShapesData extends ItemsData {
  /**
   * Loads the multi-polygon geometry for all shapes
   *
   * @param options - Optional abort signal and progress callback
   * @returns One {@link MultiPolygon} per shape, in index order
   */
  loadMultiPolygons(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<MultiPolygon[]>;
}
