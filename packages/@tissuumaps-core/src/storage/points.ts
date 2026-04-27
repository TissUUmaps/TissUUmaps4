import { type PointsDataSource } from "../model/points";
import { type ProgressCallback } from "../types";
import { type DataProvider, type ItemsData } from "./base";

/**
 * Data provider for point clouds
 *
 * @typeParam TPointsData - The concrete {@link PointsData} type produced by this data provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PointsDataProvider<
  TPointsDataSource extends PointsDataSource,
  TPointsData extends PointsData,
> extends DataProvider<TPointsDataSource, TPointsData> {}

/**
 * Loaded point cloud data providing coordinate access by dimension name
 */
export interface PointsData extends ItemsData {
  /**
   * Loads the coordinates for all points
   *
   * @param options - Optional abort signal and progress callback
   * @returns The x and y coordinates as separate arrays, in index order
   */
  loadCoordinates(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<[Float32Array, Float32Array]>;
}
