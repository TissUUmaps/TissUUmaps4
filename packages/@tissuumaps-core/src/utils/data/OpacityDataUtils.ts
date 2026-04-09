import {
  type ConstantConfig,
  type FromConfig,
  type GroupByConfig,
  type OpacityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "../../model/configs";
import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { MathUtils } from "../MathUtils";
import { DataUtilsBase } from "./DataUtilsBase";

export class OpacityDataUtils extends DataUtilsBase {
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
   * @param options - Optional abort signal, buffer alignment, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values (0–255), one per ID
   */
  static async loadOpacityData(
    ids: number[],
    config: OpacityConfig,
    opacityMaps: DefaultMap<number>[],
    defaultOpacity: number,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; opacityFactor?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1, opacityFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return OpacityDataUtils.loadConstantOpacityData(ids, config, {
        align,
        opacityFactor,
      });
    }
    if (activeConfigSource === "from" && isFromConfig(config)) {
      return OpacityDataUtils.loadFromOpacityData(
        ids,
        config,
        defaultOpacity,
        loadTable,
        { signal, align, opacityFactor },
      );
    }
    if (activeConfigSource === "groupBy" && isGroupByConfig(config)) {
      return OpacityDataUtils.loadGroupByOpacityData(
        ids,
        config,
        opacityMaps,
        defaultOpacity,
        loadTable,
        { signal, align, opacityFactor },
      );
    }
    console.warn("No valid opacity config found, using default opacity");
    return OpacityDataUtils.createUniformOpacityData(
      ids.length,
      defaultOpacity,
      { align, opacityFactor },
    );
  }

  /**
   * Creates a uniform opacity data buffer filled with the configured constant opacity.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant opacity configuration containing the opacity value
   * @param options - Optional buffer alignment and opacity scaling factor
   * @returns A `Uint8Array` filled with the encoded constant opacity
   */
  static loadConstantOpacityData(
    ids: number[],
    config: Extract<OpacityConfig, ConstantConfig<number>>,
    options?: { align?: number; opacityFactor?: number },
  ): Uint8Array {
    const { align = 1, opacityFactor = 1 } = options ?? {};
    return OpacityDataUtils.createUniformOpacityData(
      ids.length,
      config.constant.value,
      { align, opacityFactor },
    );
  }

  /**
   * Loads opacity data by reading numeric values from a table column.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source table and column
   * @param defaultOpacity - Fallback opacity when a value is missing or invalid
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values
   */
  static async loadFromOpacityData(
    ids: number[],
    config: Extract<OpacityConfig, FromConfig>,
    defaultOpacity: number,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; opacityFactor?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1, opacityFactor = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = OpacityDataUtils._createOpacityDataBuffer(ids.length, {
      align,
    });
    await OpacityDataUtils.fillFromConfigData(
      data,
      ids,
      config,
      defaultOpacity,
      loadTable,
      (value) => OpacityDataUtils.parseOpacityValue(value),
      (opacity) => OpacityDataUtils.encodeOpacity(opacity, { opacityFactor }),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Loads opacity data by grouping IDs via a table column and mapping each group
   * to an opacity value using an opacity map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source table, column, and map
   * @param opacityMaps - Available opacity maps for group-to-opacity lookups
   * @param defaultOpacity - Fallback opacity when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, and opacity scaling factor
   * @returns A `Uint8Array` of encoded opacity values
   */
  static async loadGroupByOpacityData(
    ids: number[],
    config: Extract<OpacityConfig, GroupByConfig<true>>,
    opacityMaps: DefaultMap<number>[],
    defaultOpacity: number,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
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
      return OpacityDataUtils.createUniformOpacityData(
        ids.length,
        defaultOpacity,
        { align, opacityFactor },
      );
    }
    const groupOpacities = new Map(Object.entries(opacityMap.values));
    const data = OpacityDataUtils._createOpacityDataBuffer(ids.length, {
      align,
    });
    await OpacityDataUtils.fillGroupByConfigData(
      data,
      ids,
      config,
      opacityMap.default ?? defaultOpacity,
      loadTable,
      (group) => groupOpacities.get(group),
      (opacity) => OpacityDataUtils.encodeOpacity(opacity, { opacityFactor }),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Creates an opacity data buffer of the given size filled with a single opacity value.
   *
   * @param size - Number of elements
   * @param opacity - The opacity value (0–1) to fill with
   * @param options - Optional buffer alignment and opacity scaling factor
   * @returns A `Uint8Array` filled with the encoded opacity
   */
  static createUniformOpacityData(
    size: number,
    opacity: number,
    options?: { align?: number; opacityFactor?: number },
  ): Uint8Array {
    const { align = 1, opacityFactor = 1 } = options ?? {};
    const data = OpacityDataUtils._createOpacityDataBuffer(size, { align });
    const value = OpacityDataUtils.encodeOpacity(opacity, { opacityFactor });
    data.fill(value, 0, size);
    return data;
  }

  /**
   * Parses a raw value as an opacity number, clamped to the range [0, 1].
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The clamped opacity, or `undefined` if `value` is not a number
   */
  static parseOpacityValue(value: unknown): number | undefined {
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

  private static _createOpacityDataBuffer(
    size: number,
    options?: { align?: number },
  ) {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }
}
