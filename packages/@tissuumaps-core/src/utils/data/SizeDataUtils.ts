import {
  type ConstantConfig,
  type FromConfig,
  type GroupByConfig,
  type SizeConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "../../model/configs";
import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { MathUtils } from "../MathUtils";
import { DataUtilsBase } from "./DataUtilsBase";

export class SizeDataUtils extends DataUtilsBase {
  /**
   * Loads size data for a set of IDs based on the active size configuration source.
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Size configuration specifying the data source
   * @param sizeMaps - Available size maps for groupBy lookups
   * @param defaultSize - Fallback size when no valid config or value is found
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, table ID, and size scaling factor
   * @returns A `Float32Array` of encoded size values, one per ID
   */
  static async loadSizeData(
    ids: number[],
    config: SizeConfig,
    sizeMaps: DefaultMap<number>[],
    defaultSize: number,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: {
      signal?: AbortSignal;
      align?: number;
      table?: string;
      sizeFactor?: number;
    },
  ): Promise<Float32Array> {
    const { signal, align = 1, table, sizeFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return SizeDataUtils.loadUniformSizeData(ids, config, {
        align,
        sizeFactor,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      table !== undefined
    ) {
      return await SizeDataUtils.loadSizeDataFromTableValues(
        ids,
        config,
        defaultSize,
        (options) => loadTable(table, options),
        { signal, align, sizeFactor },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      table !== undefined
    ) {
      return await SizeDataUtils.loadSizeDataFromTableGroups(
        ids,
        config,
        sizeMaps,
        defaultSize,
        (options) => loadTable(table, options),
        { signal, align, sizeFactor },
      );
    }
    console.warn("No valid size config found, using default size");
    return SizeDataUtils.createUniformSizeData(ids.length, defaultSize, {
      align,
      sizeFactor,
    });
  }

  /**
   * Creates a uniform size data buffer filled with the configured constant size.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant size configuration containing the size value
   * @param options - Optional buffer alignment and size scaling factor
   * @returns A `Float32Array` filled with the encoded constant size
   */
  static loadUniformSizeData(
    ids: number[],
    config: Extract<SizeConfig, ConstantConfig<number>>,
    options?: { align?: number; sizeFactor?: number },
  ): Float32Array {
    const { align = 1, sizeFactor = 1 } = options ?? {};
    return SizeDataUtils.createUniformSizeData(
      ids.length,
      config.constant.value,
      { align, sizeFactor },
    );
  }

  /**
   * Loads size data by reading numeric values from a table column.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source column
   * @param defaultSize - Fallback size when a value is missing or invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and size scaling factor
   * @returns A `Float32Array` of encoded size values
   */
  static async loadSizeDataFromTableValues(
    ids: number[],
    config: Extract<SizeConfig, FromConfig>,
    defaultSize: number,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; sizeFactor?: number },
  ): Promise<Float32Array> {
    const { signal, align = 1, sizeFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = SizeDataUtils._createSizeDataBuffer(ids.length, { align });
    await SizeDataUtils.fillDataFromTableValues(
      data,
      ids,
      config.from.column,
      defaultSize,
      loadTable,
      (value) => SizeDataUtils.parseSizeValue(value),
      (size) => SizeDataUtils.encodeSize(size, { sizeFactor }),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Loads size data by grouping IDs via a table column and mapping each group
   * to a size value using a size map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source table, column, and map
   * @param sizeMaps - Available size maps for group-to-size lookups
   * @param defaultSize - Fallback size when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal, buffer alignment, and size scaling factor
   * @returns A `Float32Array` of encoded size values
   */
  static async loadSizeDataFromTableGroups(
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
      return SizeDataUtils.createUniformSizeData(ids.length, defaultSize, {
        align,
        sizeFactor,
      });
    }
    const data = SizeDataUtils._createSizeDataBuffer(ids.length, { align });
    const groupSizes = new Map(Object.entries(sizeMap.values));
    await SizeDataUtils.fillDataFromTableGroups(
      data,
      ids,
      config.groupBy.column,
      sizeMap.default ?? defaultSize,
      loadTable,
      (group) => groupSizes.get(group),
      (size) => SizeDataUtils.encodeSize(size, { sizeFactor }),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Creates a size data buffer of the given size filled with a single size value.
   *
   * @param n - Number of elements
   * @param size - The size value to fill with
   * @param options - Optional buffer alignment and size scaling factor
   * @returns A `Float32Array` filled with the encoded size value
   */
  static createUniformSizeData(
    n: number,
    size: number,
    options?: { align?: number; sizeFactor?: number },
  ): Float32Array {
    const { align = 1, sizeFactor = 1 } = options ?? {};
    const data = SizeDataUtils._createSizeDataBuffer(n, { align });
    const value = SizeDataUtils.encodeSize(size, { sizeFactor });
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Parses a raw value as a size number.
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The numeric size value, or `undefined` if `value` is not a number
   */
  static parseSizeValue(value: unknown): number | undefined {
    if (typeof value === "number") {
      return value;
    }
    console.warn(`Invalid size value: ${String(value)}`);
    return undefined;
  }

  /**
   * Encodes a size value, optionally scaled by a size factor.
   *
   * @param size - The size value to encode
   * @param options - Optional size scaling factor (defaults to 1)
   * @returns The scaled size value
   */
  static encodeSize(size: number, options?: { sizeFactor?: number }): number {
    const { sizeFactor = 1 } = options ?? {};
    return size * sizeFactor;
  }

  private static _createSizeDataBuffer(
    size: number,
    options?: { align?: number },
  ): Float32Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Float32Array(alignedSize);
  }
}
