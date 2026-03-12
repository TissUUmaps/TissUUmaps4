import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

/**
 * Base interface for data loaders
 */
export interface DataLoader {
  /** JSON Schema describing the data source configuration */
  readonly dataSourceSchema: JsonSchema;

  /** UI schema controlling the form layout for the data source configuration */
  readonly dataSourceUISchema: UISchemaElement;
}

/**
 * Base interface for loaded data objects
 */
export interface Data {
  /** Releases all resources held by this data object */
  destroy(): void;
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
}
