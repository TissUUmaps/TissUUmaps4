import { type ProgressCallback } from "../types";
import { type DataStorage, type ItemsData } from "./base";

/**
 * Data storage adapter for point clouds
 *
 * @typeParam TPointsData - The concrete {@link PointsData} type produced by this loader
 */
export interface PointsDataStorage<
  TPointsData extends PointsData,
> extends DataStorage {
  /**
   * Loads the points data from the configured data source
   *
   * @param options - Optional abort signal and progress callback
   * @returns The loaded points data
   */
  loadPoints(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<TPointsData>;
}

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
