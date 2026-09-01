import {
  type ConstantConfig,
  type DefaultMap,
  type FromConfig,
  type GroupByConfig,
  MathUtils,
  ParseUtils,
  type SizeConfig,
  type TableData,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

/**
 * Resolves the size of every item, scaled by the configured size factor
 */
export class SizeResolver extends ResolverBase {
  /**
   * Loads size data for a set of IDs based on the active size configuration source
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Size configuration specifying the data source
   * @param sizeMaps - Available size maps for groupBy lookups
   * @param defaultSize - Fallback size when no valid config or value is found
   * @param options - Optional abort signal, buffer alignment, size scaling factor, and table loader
   * @returns A `Float32Array` of encoded size values, one per ID
   */
  static async resolveSizes(
    ids: number[],
    config: SizeConfig,
    sizeMaps: DefaultMap<number>[],
    defaultSize: number,
    options?: {
      signal?: AbortSignal;
      align?: number;
      sizeFactor?: number;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Float32Array> {
    const { signal, align = 1, sizeFactor = 1, loadTable } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return SizeResolver.resolveUniformSizes(ids, config, {
        align,
        sizeFactor,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      loadTable !== undefined
    ) {
      return SizeResolver.resolveSizesFromTableValues(
        ids,
        config,
        defaultSize,
        (opts) => loadTable(opts),
        { signal, align, sizeFactor },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      loadTable !== undefined
    ) {
      return SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        sizeMaps,
        defaultSize,
        (opts) => loadTable(opts),
        { signal, align, sizeFactor },
      );
    }
    console.warn("No valid size config found, using default size");
    return SizeResolver.createUniformSizes(ids.length, defaultSize, {
      align,
      sizeFactor,
    });
  }

  /**
   * Creates a uniform size data buffer filled with the configured constant size
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant size configuration containing the size value
   * @param options - Optional buffer alignment and size scaling factor
   * @returns A `Float32Array` filled with the encoded constant size
   */
  static resolveUniformSizes(
    ids: number[],
    config: Extract<SizeConfig, ConstantConfig<number>>,
    options?: { align?: number; sizeFactor?: number },
  ): Float32Array {
    const { align = 1, sizeFactor = 1 } = options ?? {};
    return SizeResolver.createUniformSizes(ids.length, config.constant.value, {
      align,
      sizeFactor,
    });
  }

  /**
   * Loads size data by reading numeric values from a table column
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source column
   * @param defaultSize - Fallback size when a value is missing or invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and size scaling factor
   * @returns A `Float32Array` of encoded size values
   */
  static async resolveSizesFromTableValues(
    ids: number[],
    config: Extract<SizeConfig, FromConfig>,
    defaultSize: number,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; sizeFactor?: number },
  ): Promise<Float32Array> {
    const { signal, align = 1, sizeFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = await loadTable({ signal });
    const buffer = SizeResolver.createSizeBuffer(ids.length, { align });
    await SizeResolver.fillFromTableValues(
      buffer,
      data,
      ids,
      config.from.column,
      defaultSize,
      (value) => SizeResolver.parseSize(value),
      (size) => SizeResolver.encodeSize(size, { sizeFactor }),
      { signal },
    );
    return buffer;
  }

  /**
   * Loads size data by grouping IDs via a table column and mapping each group
   * to a size value using a size map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source column and map
   * @param sizeMaps - Available size maps for group-to-size lookups
   * @param defaultSize - Fallback size when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and size scaling factor
   * @returns A `Float32Array` of encoded size values
   */
  static async resolveSizesFromTableGroups(
    ids: number[],
    config: Extract<SizeConfig, GroupByConfig<true>>,
    sizeMaps: DefaultMap<number>[],
    defaultSize: number,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; sizeFactor?: number },
  ): Promise<Float32Array> {
    const { signal, align = 1, sizeFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const sizeMap = sizeMaps.find(
      (sizeMap) => sizeMap.id === config.groupBy.map,
    );
    if (sizeMap === undefined) {
      console.warn(
        `Size map ${config.groupBy.map} not found, using default size`,
      );
      return SizeResolver.createUniformSizes(ids.length, defaultSize, {
        align,
        sizeFactor,
      });
    }
    const data = await loadTable({ signal });
    const buffer = SizeResolver.createSizeBuffer(ids.length, { align });
    const groupSizes = new Map(Object.entries(sizeMap.values));
    await SizeResolver.fillFromTableGroups(
      buffer,
      data,
      ids,
      config.groupBy.column,
      sizeMap.default ?? defaultSize,
      (group) => groupSizes.get(group),
      (size) => SizeResolver.encodeSize(size, { sizeFactor }),
      { signal },
    );
    return buffer;
  }

  /**
   * Creates a size data buffer of the given size filled with a single size value
   *
   * @param n - Number of elements
   * @param size - The size value to fill with
   * @param options - Optional buffer alignment and size scaling factor
   * @returns A `Float32Array` filled with the encoded size value
   */
  static createUniformSizes(
    n: number,
    size: number,
    options?: { align?: number; sizeFactor?: number },
  ): Float32Array {
    const { align = 1, sizeFactor = 1 } = options ?? {};
    const buffer = SizeResolver.createSizeBuffer(n, { align });
    const value = SizeResolver.encodeSize(size, { sizeFactor });
    buffer.fill(value, 0, n);
    return buffer;
  }

  /**
   * Creates a buffer of the given size for storing encoded size values, aligned to the specified byte boundary
   *
   * @param size - The number of elements in the buffer
   * @param options - Optional buffer alignment
   * @returns A `Float32Array` of the specified size, aligned to the given byte boundary
   */
  static createSizeBuffer(
    size: number,
    options?: { align?: number },
  ): Float32Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Float32Array(alignedSize);
  }

  /**
   * Parses a raw value as a size number
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The numeric size value, or `undefined` if `value` is not a number
   */
  static parseSize(value: unknown): number | undefined {
    return ParseUtils.tryParseFinite(value, { requireSafeBigInt: true });
  }

  /**
   * Encodes a size value, optionally scaled by a size factor
   *
   * @param size - The size value to encode
   * @param options - Optional size scaling factor (defaults to 1)
   * @returns The scaled size value
   */
  static encodeSize(size: number, options?: { sizeFactor?: number }): number {
    const { sizeFactor = 1 } = options ?? {};
    return size * sizeFactor;
  }
}
