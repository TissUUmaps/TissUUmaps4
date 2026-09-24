import type { GenericArray } from "@tissuumaps/core";

/** Data types of a {@link StoreArray}, as far as the reader tells them apart */
export type StoreDataType =
  "integer" | "float" | "string" | "boolean" | "other";

/**
 * The values of a {@link StoreArray}; 64-bit integers read as
 * `BigInt64Array`/`BigUint64Array`
 */
export type StoreValues =
  GenericArray<unknown> | BigInt64Array | BigUint64Array;

/** A named container of other nodes */
export interface StoreGroup {
  readonly kind: "group";
  /** Attribute values by name */
  readonly attrs: Readonly<Record<string, unknown>>;
  /** The names of the child nodes, in store order */
  readonly keys: string[];
}

/** An n-dimensional array of values */
export interface StoreArray {
  readonly kind: "array";
  /** The dimensions; empty for a scalar */
  readonly shape: number[];
  readonly dataType: StoreDataType;

  /**
   * @param options - Optional abort signal
   * @returns All values
   */
  read(options?: { signal?: AbortSignal }): Promise<StoreValues>;

  /**
   * @param ranges - One `[start, end)` range per dimension, or `null` for the
   * whole dimension
   * @param options - Optional abort signal
   * @returns The values within the ranges; an empty range yields an empty
   * array of any type
   */
  slice(
    ranges: ([number, number] | null)[],
    options?: { signal?: AbortSignal },
  ): Promise<StoreValues>;
}

export type StoreNode = StoreGroup | StoreArray;

/**
 * A hierarchical container of groups and arrays, such as an HDF5 file or a
 * Zarr store
 *
 * Paths are slash-separated without a leading slash; the empty path is the
 * root group.
 */
export interface Store {
  /**
   * @param path - The path of the node
   * @param options - Optional abort signal
   * @returns The node, or `null` if there is none at the path
   */
  get(
    path: string,
    options?: { signal?: AbortSignal },
  ): Promise<StoreNode | null>;

  /** Closes the store */
  close(): void;
}
