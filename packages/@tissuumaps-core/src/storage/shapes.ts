import { type MultiPolygon } from "../types";
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
   * @param options - Optional abort signal
   */
  loadShapes: (options?: { signal?: AbortSignal }) => Promise<TShapesData>;
}

/**
 * Loaded shape collection data providing multi-polygon geometry access
 */
export interface ShapesData extends ItemsData {
  /**
   * Loads the multi-polygon geometry for all shapes
   *
   * @param options - Optional abort signal
   * @returns One {@link MultiPolygon} per shape, in index order
   */
  loadMultiPolygons(options?: {
    signal?: AbortSignal;
  }): Promise<MultiPolygon[]>;
}
