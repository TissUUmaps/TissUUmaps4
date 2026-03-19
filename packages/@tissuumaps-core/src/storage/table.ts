import { type MappableArrayLike, type ProgressCallback } from "../types";
import { type DataLoader, type ItemsData } from "./base";

/**
 * Data loader for tabular data
 *
 * @typeParam TTableData - The concrete {@link TableData} type produced by this loader
 */
export interface TableDataLoader<
  TTableData extends TableData,
> extends DataLoader {
  /**
   * Loads the table data from the configured data source
   *
   * @param options - Optional abort signal and progress callback
   * @returns The loaded table data
   */
  loadTable(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<TTableData>;
}

/**
 * Loaded tabular data providing column-wise access
 */
export interface TableData extends ItemsData {
  /**
   * Returns column name suggestions matching the current query
   *
   * @param currentQuery - The partial column name to autocomplete
   * @param options - Optional abort signal
   * @returns A list of suggested column queries matching the current one
   */
  suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]>;

  /**
   * Resolves a query to an exact column name
   *
   * @param query - The column query
   * @param options - Optional abort signal
   * @returns The resolved column name, or `null` if no match is found
   */
  resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;

  /**
   * Loads a column's values as a typed array-like
   *
   * @typeParam T - Element type of the returned array
   * @param column - The column name
   * @param options - Optional abort signal and progress callback
   * @returns The column values
   */
  loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<MappableArrayLike<T>>;

  /**
   * Load a column's minimum and maximum values
   *
   * @param column - The column name
   * @param options - Optional abort signal and progress callback
   * @returns The numeric [min, max] value range of the column, or `undefined` if not numeric
   */
  loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined>;
}
