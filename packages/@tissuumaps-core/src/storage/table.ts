import { type MappableArrayLike } from "../types";
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
   * @param options - Optional abort signal
   */
  loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}

/**
 * Loaded tabular data providing column-wise access
 */
export interface TableData extends ItemsData {
  /**
   * Returns column name suggestions matching the current query
   *
   * @param currentQuery - The partial column name to autocomplete
   */
  suggestColumnQueries(currentQuery: string): Promise<string[]>;

  /**
   * Resolves a query to an exact column name
   *
   * @param query - The column query
   * @returns The resolved column name, or `null` if no match is found
   */
  getColumn(query: string): Promise<string | null>;

  /**
   * Loads a column's values as a typed array-like
   *
   * @typeParam T - Element type of the returned array
   * @param column - The column name
   * @param options - Optional abort signal
   */
  loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>>;
}
