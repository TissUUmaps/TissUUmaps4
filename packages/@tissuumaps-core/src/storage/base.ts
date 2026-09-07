import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import type { DataSource, ItemsDataSource } from "../model/base";
import type { ProgressCallback } from "../types/callbacks";
import type { TableData } from "./table";

/**
 * Options accepted by {@link DataProvider.load}
 */
export type DataProviderOpenOptions = {
  /** Signal for aborting the open operation */
  signal?: AbortSignal;

  /** Directory handle of the open workspace, if any */
  workspace?: FileSystemDirectoryHandle | null;

  /** Callback for reporting the progress of the open operation */
  onProgress?: ProgressCallback;
};

/**
 * Options accepted by {@link ItemsDataProvider.load}
 */
export type ItemsDataProviderOpenOptions = DataProviderOpenOptions & {
  /** The data of the table referenced by the data source, if any */
  tableDataPromise: Promise<TableData> | undefined;
};

/**
 * Base interface for data providers
 *
 * @typeParam TDataSource - The data source type this data provider opens
 * @typeParam TData - The {@link Data} type produced by this data provider
 * @typeParam TNormalizedDataSource - The data source type produced by
 * {@link DataProvider.normalize} and accepted by {@link DataProvider.load}
 */
export interface DataProvider<
  TDataSource extends DataSource,
  TData extends Data,
  TNormalizedDataSource extends TDataSource = TDataSource,
> {
  /** The name of the data provider */
  readonly name: string;

  /** The JSON schema for the data source */
  readonly schema: JsonSchema;

  /** The JSON Forms UI schema for the data source */
  readonly uischema: UISchemaElement;

  /**
   * Returns the data source with all of this data provider's defaults applied
   * and all of its relative URLs resolved
   *
   * Data sources that normalize to the same value are considered equal, and
   * their data is loaded only once and shared between all referencing objects.
   * Normalization has to be idempotent: normalizing an already normalized data
   * source must return the same value again.
   *
   * Relative URLs are resolved against the URL the project was loaded from,
   * and against the document base URL for projects without one.
   *
   * @param dataSource - The data source to normalize
   * @param projectUrl - The absolute URL of the project, or `null` for projects
   * that were not loaded from a URL
   * @returns The normalized data source
   */
  normalize(
    dataSource: TDataSource,
    projectUrl: string | null,
  ): TNormalizedDataSource;

  /**
   * Opens a data source and returns the loaded data accessor
   *
   * The data source has to have been normalized by
   * {@link DataProvider.normalize} beforehand.
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See {@link DataProviderOpenOptions}
   * @returns A promise that resolves to the loaded data accessor
   */
  load(
    normalizedDataSource: TNormalizedDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<TData>;
}

/**
 * Base interface for items data providers
 *
 * @typeParam TItemsDataSource - The data source type this data provider opens
 * @typeParam TItemsData - The {@link ItemsData} type produced by this data
 * provider
 * @typeParam TNormalizedItemsDataSource - The data source type produced by
 * {@link DataProvider.normalize} and accepted by {@link ItemsDataProvider.load}
 */
export interface ItemsDataProvider<
  TItemsDataSource extends ItemsDataSource,
  TItemsData extends ItemsData,
  TNormalizedItemsDataSource extends TItemsDataSource = TItemsDataSource,
> extends DataProvider<
  TItemsDataSource,
  TItemsData,
  TNormalizedItemsDataSource
> {
  /**
   * Opens a data source and returns the loaded data accessor
   *
   * The data source has to have been normalized by
   * {@link DataProvider.normalize} beforehand.
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See {@link ItemsDataProviderOpenOptions}
   * @returns A promise that resolves to the loaded data accessor
   */
  load(
    normalizedDataSource: TNormalizedItemsDataSource,
    options?: ItemsDataProviderOpenOptions,
  ): Promise<TItemsData>;
}

/**
 * Base interface for loaded data objects
 */
export interface Data {
  /** Releases all resources held by this data object */
  close(): void;
}

/**
 * A {@link Data} object that contains an indexed collection of items
 *
 * Extended by data types whose storage is addressable by item IDs
 * (e.g. points, shapes, labels, tables).
 *
 * Implementations have to be immutable: the values returned by their accessors
 * must not change over the lifetime of the object, and the arrays they return
 * have to keep their identity across calls (i.e. be memoized rather than built
 * anew on every call). Consumers rely on that identity to detect change - a
 * renderer that compares the previous `getIds()` result against the current one
 * re-uploads its GPU buffers whenever the two differ - so an implementation
 * returning a fresh array each time is correct but defeats every such cache.
 */
export interface ItemsData extends Data {
  /**
   * Returns an array of item IDs
   *
   * The returned array is owned by this data object: callers must not modify it,
   * and every call returns the very same array (see {@link ItemsData}).
   */
  getIds(): number[];

  /** Returns the total number of items */
  getSize(): number;

  /**
   * Returns the item names if available, otherwise undefined
   *
   * The returned array is owned by this data object: callers must not modify it,
   * and every call returns the very same array (see {@link ItemsData}).
   */
  getNames(): string[] | undefined;
}
