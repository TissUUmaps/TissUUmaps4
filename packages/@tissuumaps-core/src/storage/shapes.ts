import { type ShapesDataSource } from "../model/shapes";
import { type MultiPolygon, type ProgressCallback } from "../types";
import { type DataProvider, type ItemsData } from "./base";

/**
 * Data provider for shape (polygon) collections
 *
 * @typeParam TShapesData - The concrete {@link ShapesData} type produced by this data provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesDataProvider<
  TShapesDataSource extends ShapesDataSource,
  TShapesData extends ShapesData,
> extends DataProvider<TShapesDataSource, TShapesData> {}

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
