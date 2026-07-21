import {
  type ConstantConfig,
  type DefaultMap,
  type FromConfig,
  type GroupByConfig,
  HashUtils,
  type Marker,
  type MarkerConfig,
  MathUtils,
  type TableData,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  markerPalette,
} from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

export class MarkerResolver extends ResolverBase {
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
  static async resolveMarkers(
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
      return MarkerResolver.resolveUniformMarkers(ids, config, {
        align,
      });
    }
    if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      table !== undefined
    ) {
      return await MarkerResolver.resolveMarkersFromTableValues(
        ids,
        config,
        defaultMarker,
        async (options) => loadTable(table, options),
        { signal, align },
      );
    }
    if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      table !== undefined
    ) {
      return await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        markerMaps,
        defaultMarker,
        async (options) => loadTable(table, options),
        { signal, align },
      );
    }
    console.warn("No valid marker config found, using default marker");
    return MarkerResolver.createUniformMarkers(ids.length, defaultMarker, {
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
  static resolveUniformMarkers(
    ids: number[],
    config: Extract<MarkerConfig, ConstantConfig<Marker>>,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    return MarkerResolver.createUniformMarkers(
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
  static async resolveMarkersFromTableValues(
    ids: number[],
    config: Extract<MarkerConfig, FromConfig>,
    defaultMarker: Marker,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint8Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const data = MarkerResolver.createMarkerBuffer(ids.length, { align });
    await MarkerResolver.fillFromTableValues(
      data,
      ids,
      config.from.column,
      defaultMarker,
      loadTable,
      (value) => MarkerResolver.parseMarker(value),
      (marker) => MarkerResolver.encodeMarker(marker),
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
  static async resolveMarkersFromTableGroups(
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
        return MarkerResolver.createUniformMarkers(ids.length, defaultMarker, {
          align,
        });
      }
      const data = MarkerResolver.createMarkerBuffer(ids.length, {
        align,
      });
      const groupMarkers = new Map(Object.entries(markerMap.values));
      await MarkerResolver.fillFromTableGroups(
        data,
        ids,
        config.groupBy.column,
        markerMap.default ?? defaultMarker,
        loadTable,
        (group) => groupMarkers.get(group),
        (marker) => MarkerResolver.encodeMarker(marker),
        { signal },
      );
      signal?.throwIfAborted();
      return data;
    }
    const data = MarkerResolver.createMarkerBuffer(ids.length, { align });
    await MarkerResolver.fillFromTableGroups(
      data,
      ids,
      config.groupBy.column,
      defaultMarker,
      loadTable,
      (group) => HashUtils.djb2Pick(markerPalette, group),
      (marker) => MarkerResolver.encodeMarker(marker),
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
  static createUniformMarkers(
    n: number,
    marker: Marker,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const data = MarkerResolver.createMarkerBuffer(n, { align });
    const value = MarkerResolver.encodeMarker(marker);
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Creates a buffer of the given size for storing encoded marker values, aligned to the specified byte boundary.
   *
   * @param size - The number of elements in the buffer
   * @param options - Optional buffer alignment
   * @returns A `Uint8Array` of the specified size, aligned to the given byte boundary
   */
  static createMarkerBuffer(
    size: number,
    options?: { align?: number },
  ): Uint8Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint8Array(alignedSize);
  }

  /**
   * Parses a raw value as a {@link Marker}.
   *
   * @param value - The raw value to parse (must be a number)
   * @returns The value cast to a {@link Marker}, or `undefined` if not a number
   */
  static parseMarker(value: unknown): Marker | undefined {
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
}
