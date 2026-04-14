import { type TableDataSource } from "../model/table";
import { type GenericArray, type ProgressCallback } from "../types";
import { type DataProvider, type ItemsData } from "./base";

/**
 * Data provider for tabular data
 *
 * @typeParam TTableData - The concrete {@link TableData} type produced by this data provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableDataProvider<
  TTableDataSource extends TableDataSource,
  TTableData extends TableData,
> extends DataProvider<TTableDataSource, TTableData> {}

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
  ): Promise<GenericArray<T>>;

  /**
   * Load a column's unique values as a typed array-like
   *
   * @typeParam T - Element type of the returned array
   * @param column - The column name
   * @param options - Optional abort signal and progress callback
   * @returns The unique column values
   */
  loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>>;

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
