import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import type { DataSource, ItemsDataSource } from "../model/base";
import type { ProgressCallback } from "../types/callbacks";

/**
 * Base interface for data providers
 */
export interface DataProvider<
  TDataSource extends DataSource,
  TData extends Data,
> {
  /** The name of the data provider */
  readonly name: string;

  /** The JSON schema for the data source */
  readonly schema: JsonSchema;

  /** The JSON Forms UI schema for the data source */
  readonly uischema: UISchemaElement;

  /**
   * Opens a data source and returns the loaded data accessor
   *
   * @param dataSource - The data source to open
   * @param options - Optional abort signal, progress callback, and workspace directory handle
   * @returns A promise that resolves to the loaded data accessor
   */
  open(
    dataSource: TDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<TData>;
}

/**
 * Base interface for items data providers
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemsDataProvider<
  TItemsDataSource extends ItemsDataSource,
  TItemsData extends ItemsData,
> extends DataProvider<TItemsDataSource, TItemsData> {}

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
