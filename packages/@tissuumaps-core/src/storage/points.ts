import { type DataLoader, type ItemsData } from "./base";

/**
 * Data loader for point clouds
 *
 * @typeParam TPointsData - The concrete {@link PointsData} type produced by this loader
 */
export interface PointsDataLoader<
  TPointsData extends PointsData,
> extends DataLoader {
  /**
   * Loads the points data from the configured data source
   *
   * @param options - Optional abort signal
   */
  loadPoints(options: { signal?: AbortSignal }): Promise<TPointsData>;
}

/**
 * Loaded point cloud data providing coordinate access by dimension name
 */
export interface PointsData extends ItemsData {
  /**
   * Returns dimension name suggestions matching the current query
   *
   * @param currentQuery - The partial dimension name to autocomplete
   */
  suggestDimensionQueries(currentQuery: string): Promise<string[]>;

  /**
   * Resolves a query to an exact dimension name
   *
   * @param query - The dimension query
   * @returns The resolved dimension name, or `null` if no match is found
   */
  getDimension(query: string): Promise<string | null>;

  /**
   * Loads the coordinate values for a dimension as a float array
   *
   * @param dimension - The dimension name (e.g. an X or Y coordinate column)
   * @param options - Optional abort signal
   */
  loadCoordinates(
    dimension: string,
    options: { signal?: AbortSignal },
  ): Promise<Float32Array>;
}
