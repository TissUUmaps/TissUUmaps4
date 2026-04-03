import type { PointsDataSource } from "../model/points";
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
   * Returns dimension name suggestions matching the current query
   *
   * @param currentQuery - The partial dimension name to autocomplete
   * @param options - Optional abort signal
   * @returns A list of suggested dimension names matching the query
   */
  suggestDimensionQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]>;

  /**
   * Resolves a query to an exact dimension name
   *
   * @param query - The dimension query
   * @param options - Optional abort signal
   * @returns The resolved dimension name, or `null` if no match is found
   */
  resolveDimensionQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;

  /**
   * Loads the coordinate values for a dimension as a float array
   *
   * @param dimension - The dimension name (e.g. an X or Y coordinate column)
   * @param options - Optional abort signal and progress callback
   * @returns The coordinate values for the dimension
   */
  loadCoordinates(
    dimension: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<Float32Array>;
}
