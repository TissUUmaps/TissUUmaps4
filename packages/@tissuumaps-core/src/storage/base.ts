/**
 * Base interface for data loaders
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataLoader {}

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
