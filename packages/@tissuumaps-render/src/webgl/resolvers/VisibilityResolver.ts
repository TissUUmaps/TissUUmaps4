import {
  type ConstantConfig,
  type DefaultMap,
  type FromConfig,
  type GroupByConfig,
  MathUtils,
  ParseUtils,
  type TableData,
  type VisibilityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

/**
 * Resolves the visibility of every item, encoded as `0` or `1`
 */
export class VisibilityResolver extends ResolverBase {
  /**
   * Loads visibility data for a set of IDs based on the active visibility configuration source
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Visibility configuration specifying the data source
   * @param visibilityMaps - Available visibility maps for groupBy lookups
   * @param defaultVisibility - Fallback visibility when no valid config or value is found
   * @param options - Optional abort signal, buffer alignment, and table loader
   * @returns A `Uint8Array` of encoded visibility values (0 or 1), one per ID
   */
  static async resolveVisibilities(
    ids: number[],
    config: VisibilityConfig,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    options?: {
      signal?: AbortSignal;
      align?: number;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const { signal, align = 1, loadTable } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return VisibilityResolver.resolveUniformVisibilities(ids, config, {
        align,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      loadTable !== undefined
    ) {
      return VisibilityResolver.resolveVisibilitiesFromTableValues(
        ids,
        config,
        defaultVisibility,
        (opts) => loadTable(opts),
        { signal, align },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      loadTable !== undefined
    ) {
      return VisibilityResolver.resolveVisibilitiesFromTableGroups(
        ids,
        config,
        visibilityMaps,
        defaultVisibility,
        (opts) => loadTable(opts),
        { signal, align },
      );
    }
    console.warn("No valid visibility config found, using default visibility");
    return VisibilityResolver.createUniformVisibilities(
      ids.length,
      defaultVisibility,
      { align },
    );
  }

  /**
   * Creates a uniform visibility data buffer filled with the configured constant visibility
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant visibility configuration containing the boolean value
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded constant visibility
   */
  static resolveUniformVisibilities(
    ids: number[],
    config: Extract<VisibilityConfig, ConstantConfig<boolean>>,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    return VisibilityResolver.createUniformVisibilities(
      ids.length,
      config.constant.value,
      { align },
    );
  }

  /**
   * Loads visibility data by reading values from a table column and parsing them as booleans
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source column
   * @param defaultVisibility - Fallback visibility when a value is missing or invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded visibility values
   */
  static async resolveVisibilitiesFromTableValues(
    ids: number[],
    config: Extract<VisibilityConfig, FromConfig>,
    defaultVisibility: boolean,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = await loadTable({ signal });
    const buffer = VisibilityResolver.createVisibilityBuffer(ids.length, {
      align,
    });
    await VisibilityResolver.fillFromTableValues(
      buffer,
      data,
      ids,
      config.from.column,
      defaultVisibility,
      (value) => VisibilityResolver.parseVisibility(value),
      (visibility) => VisibilityResolver.encodeVisibility(visibility),
      { signal },
    );
    return buffer;
  }

  /**
   * Loads visibility data by grouping IDs via a table column and mapping each group
   * to a boolean visibility value using a visibility map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source column and map
   * @param visibilityMaps - Available visibility maps for group-to-boolean lookups
   * @param defaultVisibility - Fallback visibility when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded visibility values
   */
  static async resolveVisibilitiesFromTableGroups(
    ids: number[],
    config: Extract<VisibilityConfig, GroupByConfig<true>>,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const visibilityMap = visibilityMaps.find(
      (visibilityMap) => visibilityMap.id === config.groupBy.map,
    );
    if (visibilityMap === undefined) {
      console.warn(
        `Visibility map ${config.groupBy.map} not found, using default visibility`,
      );
      return VisibilityResolver.createUniformVisibilities(
        ids.length,
        defaultVisibility,
        { align },
      );
    }
    const data = await loadTable({ signal });
    const buffer = VisibilityResolver.createVisibilityBuffer(ids.length, {
      align,
    });
    const groupVisibilities = new Map(Object.entries(visibilityMap.values));
    await VisibilityResolver.fillFromTableGroups(
      buffer,
      data,
      ids,
      config.groupBy.column,
      visibilityMap.default ?? defaultVisibility,
      (group) => groupVisibilities.get(group),
      (visibility) => VisibilityResolver.encodeVisibility(visibility),
      { signal },
    );
    return buffer;
  }

  /**
   * Creates a visibility data buffer of the given size filled with a single visibility value
   *
   * @param n - Number of elements
   * @param visibility - The boolean visibility to fill with
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded visibility
   */
  static createUniformVisibilities(
    n: number,
    visibility: boolean,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const buffer = VisibilityResolver.createVisibilityBuffer(n, { align });
    const value = VisibilityResolver.encodeVisibility(visibility);
    buffer.fill(value, 0, n);
    return buffer;
  }

  /**
   * Creates a buffer of the given size for storing encoded visibility values, aligned to the specified byte boundary
   *
   * @param size - The number of elements in the buffer
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` of the specified size, aligned to the given byte boundary
   */
  static createVisibilityBuffer(
    size: number,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }

  /**
   * Parses a raw value as a boolean visibility (truthy if greater than 0)
   *
   * @param value - The raw value to parse (must be a number)
   * @returns `true` if the value is greater than 0, `false` if 0 or negative, or `undefined` if not a number
   */
  static parseVisibility(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }
    const visibility = ParseUtils.tryParseFinite(value, {
      requireSafeBigInt: true,
    });
    return visibility !== undefined ? visibility > 0 : undefined;
  }

  /**
   * Encodes a boolean visibility into a numeric representation
   *
   * @param visibility - The boolean visibility to encode
   * @returns `1` if visible, `0` if not
   */
  static encodeVisibility(visibility: boolean): number {
    return visibility ? 1 : 0;
  }
}
