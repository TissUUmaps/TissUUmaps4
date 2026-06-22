import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import type { DataSource, ItemsDataSource } from "../model/base";
import type { ProgressCallback } from "../types";

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
 */
export interface ItemsData extends Data {
  /** Returns an array of item IDs */
  getIds(): number[];

  /** Returns the total number of items */
  getSize(): number;

  /** Returns the item names if available, otherwise undefined */
  getNames(): string[] | undefined;
}
