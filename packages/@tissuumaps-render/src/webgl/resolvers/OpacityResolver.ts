import {
  type ConstantConfig,
  type DefaultMap,
  type FromConfig,
  type GroupByConfig,
  MathUtils,
  type OpacityConfig,
  type TableData,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

export class OpacityResolver extends ResolverBase {
  /**
   * Loads opacity data for a set of IDs based on the active opacity configuration source.
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Opacity configuration specifying the data source
   * @param opacityMaps - Available opacity maps for groupBy lookups
   * @param defaultOpacity - Fallback opacity value (0–1) when no valid config or value is found
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, table ID, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values (0–255), one per ID
   */
  static async resolveOpacities(
    ids: number[],
    config: OpacityConfig,
    opacityMaps: DefaultMap<number>[],
    defaultOpacity: number,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: {
      signal?: AbortSignal;
      align?: number;
      table?: string;
      opacityFactor?: number;
    },
  ): Promise<Uint8Array> {
    const { signal, align = 1, table, opacityFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return OpacityResolver.resolveUniformOpacities(ids, config, {
        align,
        opacityFactor,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      table !== undefined
    ) {
      return await OpacityResolver.resolveOpacitiesDataFromTableValues(
        ids,
        config,
        defaultOpacity,
        async (options) => loadTable(table, options),
        { signal, align, opacityFactor },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      table !== undefined
    ) {
      return await OpacityResolver.resolveOpacitiesFromTableGroups(
        ids,
        config,
        opacityMaps,
        defaultOpacity,
        async (options) => loadTable(table, options),
        { signal, align, opacityFactor },
      );
    }
    console.warn("No valid opacity config found, using default opacity");
    return OpacityResolver.createUniformOpacities(ids.length, defaultOpacity, {
      align,
      opacityFactor,
    });
  }

  /**
   * Creates a uniform opacity data buffer filled with the configured constant opacity.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant opacity configuration containing the opacity value
   * @param options - Optional buffer alignment and opacity scaling factor
   * @returns A `Uint8Array` filled with the encoded constant opacity
   */
  static resolveUniformOpacities(
    ids: number[],
    config: Extract<OpacityConfig, ConstantConfig<number>>,
    options?: { align?: number; opacityFactor?: number },
  ): Uint8Array {
    const { align = 1, opacityFactor = 1 } = options ?? {};
    return OpacityResolver.createUniformOpacities(
      ids.length,
      config.constant.value,
      { align, opacityFactor },
    );
  }

  /**
   * Loads opacity data by reading numeric values from a table column.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source column
   * @param defaultOpacity - Fallback opacity when a value is missing or invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values
   */
  static async resolveOpacitiesDataFromTableValues(
    ids: number[],
    config: Extract<OpacityConfig, FromConfig>,
    defaultOpacity: number,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; opacityFactor?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1, opacityFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = OpacityResolver.createOpacityBuffer(ids.length, {
      align,
    });
    await OpacityResolver.fillFromTableValues(
      data,
      ids,
      config.from.column,
      defaultOpacity,
      loadTable,
      (value) => OpacityResolver.parseOpacity(value),
      (opacity) => OpacityResolver.encodeOpacity(opacity, { opacityFactor }),
      { signal },
    );
    return data;
  }

  /**
   * Loads opacity data by grouping IDs via a table column and mapping each group
   * to an opacity value using an opacity map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source column and map
   * @param opacityMaps - Available opacity maps for group-to-opacity lookups
   * @param defaultOpacity - Fallback opacity when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values
   */
  static async resolveOpacitiesFromTableGroups(
    ids: number[],
    config: Extract<OpacityConfig, GroupByConfig<true>>,
    opacityMaps: DefaultMap<number>[],
    defaultOpacity: number,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; opacityFactor?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1, opacityFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const opacityMap = opacityMaps.find(
      (opacityMap) => opacityMap.id === config.groupBy.map,
    );
    if (opacityMap === undefined) {
      console.warn(
        `Opacity map ${config.groupBy.map} not found, using default opacity`,
      );
      return OpacityResolver.createUniformOpacities(
        ids.length,
        defaultOpacity,
        { align, opacityFactor },
      );
    }
    const data = OpacityResolver.createOpacityBuffer(ids.length, {
      align,
    });
    const groupOpacities = new Map(Object.entries(opacityMap.values));
    await OpacityResolver.fillFromTableGroups(
      data,
      ids,
      config.groupBy.column,
      opacityMap.default ?? defaultOpacity,
      loadTable,
      (group) => groupOpacities.get(group),
      (opacity) => OpacityResolver.encodeOpacity(opacity, { opacityFactor }),
      { signal },
    );
    return data;
  }

  /**
   * Creates an opacity data buffer of the given size filled with a single opacity value.
   *
   * @param n - Number of elements
   * @param opacity - The opacity value (0–1) to fill with
   * @param options - Optional buffer alignment and opacity scaling factor
   * @returns A `Uint8Array` filled with the encoded opacity
   */
  static createUniformOpacities(
    n: number,
    opacity: number,
    options?: { align?: number; opacityFactor?: number },
  ): Uint8Array {
    const { align = 1, opacityFactor = 1 } = options ?? {};
    const data = OpacityResolver.createOpacityBuffer(n, { align });
    const value = OpacityResolver.encodeOpacity(opacity, { opacityFactor });
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Creates a buffer of the given size for storing encoded opacity values, aligned to the specified byte boundary.
   *
   * @param size - The number of elements in the buffer
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` of the specified size, aligned to the given byte boundary
   */
  static createOpacityBuffer(size: number, options?: { align?: number }) {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }

  /**
   * Parses a raw value as an opacity number, clamped to the range [0, 1].
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The clamped opacity, or `undefined` if `value` is not a number
   */
  static parseOpacity(value: unknown): number | undefined {
    if (typeof value === "number") {
      return MathUtils.clamp(value, 0, 1);
    }
    console.warn(`Invalid opacity value: ${String(value)}`);
    return undefined;
  }

  /**
   * Encodes an opacity value (0–1) into a `Uint8Array`-compatible integer (0–255),
   * optionally scaled by an opacity factor.
   *
   * @param opacity - The opacity value (0–1)
   * @param options - Optional opacity scaling factor (defaults to 1)
   * @returns The encoded opacity as an integer in the range [0, 255]
   */
  static encodeOpacity(
    opacity: number,
    options?: { opacityFactor?: number },
  ): number {
    const { opacityFactor = 1 } = options ?? {};
    return MathUtils.clamp(Math.round(opacity * opacityFactor * 255), 0, 255);
  }
}
