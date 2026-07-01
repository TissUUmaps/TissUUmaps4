import {
  type ConstantConfig,
  type FromConfig,
  type GroupByConfig,
  type MarkerConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "../../model/configs";
import type { DefaultMap, Marker } from "../../model/types";
import { markerPalette } from "../../palettes";
import type { TableData } from "../../storage/table";
import { HashUtils } from "../HashUtils";
import { MathUtils } from "../MathUtils";
import { DataUtilsBase } from "./DataUtilsBase";

export class MarkerDataUtils extends DataUtilsBase {
  /**
   * Loads marker data for a set of IDs based on the active marker configuration source.
   *
   * Dispatches to the appropriate loader (constant, from, or groupBy) depending on which
   * configuration source is active.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Marker configuration specifying the data source
   * @param markerMaps - Available marker maps for groupBy lookups
   * @param defaultMarker - Fallback marker when no valid config or value is found
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, and table ID
   * @returns A `Uint8Array` of encoded marker values, one per ID
   */
  static async loadMarkerData(
    ids: number[],
    config: MarkerConfig,
    markerMaps: DefaultMap<Marker>[],
    defaultMarker: Marker,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number; table?: string },
  ): Promise<Uint8Array> {
    const { signal, align = 1, table } = options ?? {};
    signal?.throwIfAborted();
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      return MarkerDataUtils.loadUniformMarkerData(ids, config, {
        align,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      table !== undefined
    ) {
      return await MarkerDataUtils.loadMarkerDataFromTableValues(
        ids,
        config,
        defaultMarker,
        (options) => loadTable(table, options),
        { signal, align },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      table !== undefined
    ) {
      return await MarkerDataUtils.loadMarkerDataFromTableGroups(
        ids,
        config,
        markerMaps,
        defaultMarker,
        (options) => loadTable(table, options),
        { signal, align },
      );
    }
    console.warn("No valid marker config found, using default marker");
    return MarkerDataUtils.createUniformMarkerData(ids.length, defaultMarker, {
      align,
    });
  }

  /**
   * Creates a uniform marker data buffer filled with the configured constant marker.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant marker configuration containing the marker value
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded constant marker
   */
  static loadUniformMarkerData(
    ids: number[],
    config: Extract<MarkerConfig, ConstantConfig<Marker>>,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    return MarkerDataUtils.createUniformMarkerData(
      ids.length,
      config.constant.value,
      { align },
    );
  }

  /**
   * Loads marker data by reading values from a table column and parsing them as markers.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source column
   * @param defaultMarker - Fallback marker when a value is missing or invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded marker values
   */
  static async loadMarkerDataFromTableValues(
    ids: number[],
    config: Extract<MarkerConfig, FromConfig>,
    defaultMarker: Marker,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = MarkerDataUtils._createMarkerDataBuffer(ids.length, { align });
    await MarkerDataUtils.fillDataFromTableValues(
      data,
      ids,
      config.from.column,
      defaultMarker,
      loadTable,
      (value) => MarkerDataUtils.parseMarkerValue(value),
      (marker) => MarkerDataUtils.encodeMarker(marker),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Loads marker data by grouping IDs via a table column and mapping each group
   * to a marker using either a marker map or the default marker palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source column and optional map
   * @param markerMaps - Available marker maps for group-to-marker lookups
   * @param defaultMarker - Fallback marker when the map is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint8Array` of encoded marker values
   */
  static async loadMarkerDataFromTableGroups(
    ids: number[],
    config: Extract<MarkerConfig, GroupByConfig<false>>,
    markerMaps: DefaultMap<Marker>[],
    defaultMarker: Marker,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ) {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    if (config.groupBy.map !== undefined) {
      const markerMap = markerMaps.find(
        (markerMap) => markerMap.id === config.groupBy.map,
      );
      if (markerMap === undefined) {
        console.warn(
          `Marker map ${config.groupBy.map} not found, using default marker`,
        );
        return MarkerDataUtils.createUniformMarkerData(
          ids.length,
          defaultMarker,
          { align },
        );
      }
      const data = MarkerDataUtils._createMarkerDataBuffer(ids.length, {
        align,
      });
      const groupMarkers = new Map(Object.entries(markerMap.values));
      await MarkerDataUtils.fillDataFromTableGroups(
        data,
        ids,
        config.groupBy.column,
        markerMap.default ?? defaultMarker,
        loadTable,
        (group) => groupMarkers.get(group),
        (marker) => MarkerDataUtils.encodeMarker(marker),
        { signal },
      );
      signal?.throwIfAborted();
      return data;
    }
    const data = MarkerDataUtils._createMarkerDataBuffer(ids.length, { align });
    await MarkerDataUtils.fillDataFromTableGroups(
      data,
      ids,
      config.groupBy.column,
      defaultMarker,
      loadTable,
      (group) => HashUtils.djb2Pick(markerPalette, group),
      (marker) => MarkerDataUtils.encodeMarker(marker),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Creates a marker data buffer of the given size filled with a single marker.
   *
   * @param n - Number of elements
   * @param marker - The marker to fill with
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` filled with the encoded marker
   */
  static createUniformMarkerData(
    n: number,
    marker: Marker,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const data = MarkerDataUtils._createMarkerDataBuffer(n, { align });
    const value = MarkerDataUtils.encodeMarker(marker);
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Parses a raw value as a {@link Marker}.
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The value cast to a {@link Marker}, or `undefined` if not a number
   */
  static parseMarkerValue(value: unknown): Marker | undefined {
    if (typeof value === "number") {
      return value as Marker;
    }
    console.warn(`Invalid marker value: ${String(value)}`);
    return undefined;
  }

  /**
   * Encodes a {@link Marker} into its numeric representation.
   *
   * @param marker - The marker to encode
   * @returns The marker index as a number
   */
  static encodeMarker(marker: Marker): number {
    return marker;
  }

  private static _createMarkerDataBuffer(
    size: number,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }
}
