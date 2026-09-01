import type { PointsDataSource } from "../model/points";
import type { ProgressCallback } from "../types/callbacks";
import type { ItemsData, ItemsDataProvider } from "./base";

/**
 * Data provider for point clouds
 *
 * @typeParam TPointsDataSource - The data source type this data provider opens
 * @typeParam TPointsData - The {@link PointsData} type produced by this data
 * provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PointsDataProvider<
  TPointsDataSource extends PointsDataSource,
  TPointsData extends PointsData,
> extends ItemsDataProvider<TPointsDataSource, TPointsData> {}

/**
 * Loaded point cloud data providing coordinate access
 */
export interface PointsData extends ItemsData {
  /**
   * Loads the geometry for all points
   *
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the loaded points geometry
   */
  loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<PointsGeometry>;
}

/** Point cloud geometry consisting of separate arrays for x and y coordinates */
export type PointsGeometry = {
  /** X coordinates of the points */
  xs: Float32Array;

  /** Y coordinates of the points */
  ys: Float32Array;
};
