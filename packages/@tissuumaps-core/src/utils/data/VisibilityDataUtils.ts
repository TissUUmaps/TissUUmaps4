import {
  type ConstantConfig,
  type FromConfig,
  type GroupByConfig,
  type VisibilityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "../../model/configs";
import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { MathUtils } from "../MathUtils";
import { DataUtilsBase } from "./DataUtilsBase";

export class VisibilityDataUtils extends DataUtilsBase {
  /**
   * Loads visibility data for a set of IDs based on the active visibility configuration source.
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Visibility configuration specifying the data source
   * @param visibilityMaps - Available visibility maps for groupBy lookups
   * @param defaultVisibility - Fallback visibility when no valid config or value is found
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded visibility values (0 or 1), one per ID
   */
  static async loadVisibilityData(
    ids: number[],
    config: VisibilityConfig,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return VisibilityDataUtils.loadConstantVisibilityData(ids, config, {
        align,
      });
    }
    if (activeConfigSource === "from" && isFromConfig(config)) {
      return await VisibilityDataUtils.loadFromVisibilityData(
        ids,
        config,
        defaultVisibility,
        loadTable,
        { signal, align },
      );
    }
    if (activeConfigSource === "groupBy" && isGroupByConfig(config)) {
      return await VisibilityDataUtils.loadGroupByVisibilityData(
        ids,
        config,
        visibilityMaps,
        defaultVisibility,
        loadTable,
        { signal, align },
      );
    }
    console.warn("No valid visibility config found, using default visibility");
    return VisibilityDataUtils.createUniformVisibilityData(
      ids.length,
      defaultVisibility,
      { align },
    );
  }

  /**
   * Creates a uniform visibility data buffer filled with the configured constant visibility.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant visibility configuration containing the boolean value
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded constant visibility
   */
  static loadConstantVisibilityData(
    ids: number[],
    config: Extract<VisibilityConfig, ConstantConfig<boolean>>,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    return VisibilityDataUtils.createUniformVisibilityData(
      ids.length,
      config.constant.value,
      { align },
    );
  }

  /**
   * Loads visibility data by reading values from a table column and parsing them as booleans.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source table and column
   * @param defaultVisibility - Fallback visibility when a value is missing or invalid
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded visibility values
   */
  static async loadFromVisibilityData(
    ids: number[],
    config: Extract<VisibilityConfig, FromConfig>,
    defaultVisibility: boolean,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = VisibilityDataUtils._createVisibilityDataBuffer(ids.length, {
      align,
    });
    await VisibilityDataUtils.fillFromConfigData(
      data,
      ids,
      config,
      defaultVisibility,
      loadTable,
      (value) => VisibilityDataUtils.parseVisibilityValue(value),
      (visibility) => VisibilityDataUtils.encodeVisibility(visibility),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Loads visibility data by grouping IDs via a table column and mapping each group
   * to a boolean visibility value using a visibility map.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source table, column, and map
   * @param visibilityMaps - Available visibility maps for group-to-boolean lookups
   * @param defaultVisibility - Fallback visibility when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded visibility values
   */
  static async loadGroupByVisibilityData(
    ids: number[],
    config: Extract<VisibilityConfig, GroupByConfig<true>>,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
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
      return VisibilityDataUtils.createUniformVisibilityData(
        ids.length,
        defaultVisibility,
        { align },
      );
    }
    const data = VisibilityDataUtils._createVisibilityDataBuffer(ids.length, {
      align,
    });
    const groupVisibilities = new Map(Object.entries(visibilityMap.values));
    await VisibilityDataUtils.fillGroupByConfigData(
      data,
      ids,
      config,
      visibilityMap.default ?? defaultVisibility,
      loadTable,
      (group) => groupVisibilities.get(group),
      (visibility) => VisibilityDataUtils.encodeVisibility(visibility),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Creates a visibility data buffer of the given size filled with a single visibility value.
   *
   * @param n - Number of elements
   * @param visibility - The boolean visibility to fill with
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded visibility
   */
  static createUniformVisibilityData(
    n: number,
    visibility: boolean,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const data = VisibilityDataUtils._createVisibilityDataBuffer(n, {
      align,
    });
    const value = VisibilityDataUtils.encodeVisibility(visibility);
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Parses a raw value as a boolean visibility (truthy if greater than 0).
   *
   * @param value - The raw value to parse (must be a number)
   * @returns `true` if the value is greater than 0, `false` if 0 or negative, or `undefined` if not a number
   */
  static parseVisibilityValue(value: unknown): boolean | undefined {
    if (typeof value === "number") {
      return value > 0;
    }
    console.warn(`Invalid visibility value: ${String(value)}`);
    return undefined;
  }

  /**
   * Encodes a boolean visibility into a numeric representation.
   *
   * @param visibility - The boolean visibility to encode
   * @returns `1` if visible, `0` if not
   */
  static encodeVisibility(visibility: boolean): number {
    return visibility ? 1 : 0;
  }

  private static _createVisibilityDataBuffer(
    size: number,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }
}
