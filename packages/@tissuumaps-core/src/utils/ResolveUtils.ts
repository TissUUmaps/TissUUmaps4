import {
  type ColorConfig,
  type FromConfig,
  type GroupByConfig,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "../model/configs";
import { type Color, type DefaultMap, type Marker } from "../model/types";
import { colorPalettes, markerPalette } from "../palettes";
import { type TableData } from "../storage/table";
import { type MappableArrayLike, type TypedArray } from "../types";
import { ColorUtils } from "./ColorUtils";
import { HashUtils } from "./HashUtils";
import { MathUtils } from "./MathUtils";

/** Utility methods for resolving data from layer configs */
export class ResolveUtils {
  /**
   * Resolves a `Uint8Array` of marker indices for the given item IDs
   *
   * Supports constant, `from`-column, and `groupBy`-column config sources.
   * Table values are parsed as numeric marker indices. When mapping from a group-by column,
   * group keys are JSON-stringified and mapped to marker indices via a provided marker map.
   * If no marker map is provided, group keys are hashed and mapped to all available markers.
   * If a mapping is missing or parsing fails, the `defaultMarker` is used instead.
   *
   * @param ids - Ordered list of item IDs to resolve
   * @param markerConfig - The marker configuration describing the data source
   * @param markerMaps - Named maps from group strings to {@link Marker} values
   * @param defaultMarker - Fallback marker used when a value cannot be resolved
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options.signal - Optional abort signal
   * @param options.align - Optional alignment for the output array length
   * @returns A `Uint8Array` of length `align(ids.length, align)` with encoded markers
   */
  static async resolveMarkers(
    ids: number[],
    markerConfig: MarkerConfig,
    markerMaps: DefaultMap<Marker>[],
    defaultMarker: Marker,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, align }: { signal?: AbortSignal; align?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const encodeMarker = (marker: Marker) => marker as number;
    const data = new Uint8Array(MathUtils.align(ids.length, align ?? 1));
    const activeConfigSource = getActiveConfigSource(markerConfig);
    if (activeConfigSource === "constant" && isConstantConfig(markerConfig)) {
      data.fill(encodeMarker(markerConfig.constant.value), 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(markerConfig)) {
      const parseMarker = (tableValue: unknown) => {
        if (typeof tableValue === "number") {
          return tableValue as Marker;
        }
        console.warn(`Invalid marker table value: ${String(tableValue)}`);
        return undefined;
      };
      await ResolveUtils.fillFrom(
        data,
        ids,
        markerConfig,
        loadTable,
        parseMarker,
        defaultMarker,
        encodeMarker,
        { signal },
      );
      signal?.throwIfAborted();
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(markerConfig)
    ) {
      let markerMap;
      if (markerConfig.groupBy.map !== undefined) {
        markerMap = markerMaps.find((m) => m.id === markerConfig.groupBy.map);
        if (markerMap === undefined) {
          console.warn(`Marker map ${markerConfig.groupBy.map} not found`);
        }
      }
      if (markerConfig.groupBy.map !== undefined && markerMap !== undefined) {
        const groupMarkers = new Map(Object.entries(markerMap.values));
        const defaultGroupMarker = markerMap.default;
        const mapToMarker = (tableGroup: string) =>
          groupMarkers.get(tableGroup) ?? defaultGroupMarker;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          markerConfig,
          loadTable,
          mapToMarker,
          defaultMarker,
          encodeMarker,
          { signal },
        );
        signal?.throwIfAborted();
      } else if (markerConfig.groupBy.map === undefined) {
        const mapToMarker = (tableGroup: string) =>
          markerPalette[HashUtils.djb2(tableGroup) % markerPalette.length]!;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          markerConfig,
          loadTable,
          mapToMarker,
          defaultMarker,
          encodeMarker,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        data.fill(encodeMarker(defaultMarker), 0, ids.length);
      }
    } else {
      data.fill(encodeMarker(defaultMarker), 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves a `Float32Array` of size values for the given item IDs
   *
   * Supports constant, `from`-column, and `groupBy`-column config sources.
   * Table values are parsed as numeric sizes. When mapping from a group-by column,
   * group keys are JSON-stringified and mapped to sizes via a provided size map.
   * If a mapping is missing or parsing fails, the `defaultSize` is used instead.
   * Each resolved size is multiplied by `sizeFactor` before being stored.
   *
   * @param ids - Ordered list of item IDs to resolve
   * @param sizeConfig - The size configuration describing the data source
   * @param sizeMaps - Named maps from group strings to numeric size values
   * @param defaultSize - Fallback size used when a value cannot be resolved
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options.signal - Optional abort signal
   * @param options.align - Optional alignment for the output array length
   * @param options.sizeFactor - Scalar multiplied into every resolved size (default `1`)
   * @returns A `Float32Array` of length `align(ids.length, align)` with scaled sizes
   */
  static async resolveSizes(
    ids: number[],
    sizeConfig: SizeConfig,
    sizeMaps: DefaultMap<number>[],
    defaultSize: number,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      align,
      sizeFactor = 1,
    }: {
      signal?: AbortSignal;
      align?: number;
      sizeFactor?: number;
    } = {},
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    const encodeSize = (size: number) => size * sizeFactor;
    const data = new Float32Array(MathUtils.align(ids.length, align ?? 1));
    const activeConfigSource = getActiveConfigSource(sizeConfig);
    if (activeConfigSource === "constant" && isConstantConfig(sizeConfig)) {
      data.fill(encodeSize(sizeConfig.constant.value), 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(sizeConfig)) {
      const parseSize = (tableValue: unknown) => {
        if (typeof tableValue === "number") {
          return tableValue;
        }
        console.warn(`Invalid size table value: ${String(tableValue)}`);
        return undefined;
      };
      await ResolveUtils.fillFrom(
        data,
        ids,
        sizeConfig,
        loadTable,
        parseSize,
        defaultSize,
        encodeSize,
        { signal },
      );
      signal?.throwIfAborted();
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(sizeConfig)
    ) {
      const sizeMap = sizeMaps.find((m) => m.id === sizeConfig.groupBy.map);
      if (sizeMap !== undefined) {
        const groupSizes = new Map(Object.entries(sizeMap.values));
        const mapToSize = (tableGroup: string) =>
          groupSizes.get(tableGroup) ?? sizeMap.default;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          sizeConfig,
          loadTable,
          mapToSize,
          defaultSize,
          encodeSize,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        console.warn(`Size map ${sizeConfig.groupBy.map} not found`);
        data.fill(encodeSize(defaultSize), 0, ids.length);
      }
    } else {
      data.fill(encodeSize(defaultSize), 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves a `Uint32Array` of packed `0xRRGGBBAA` color values for the given item IDs
   *
   * Supports constant, `from`-column (palette-mapped), `groupBy`-column, and random config sources.
   * Table values are parsed as numeric color values and mapped to RGBA via a provided color palette.
   * When mapping from a group-by column, group keys are JSON-stringified and mapped to colors via a provided color map.
   * If no color map is provided, group keys are hashed and mapped to a provided color range and palette.
   * If a mapping is missing or parsing fails, the `defaultColor` is used instead.
   * After colors are resolved, the alpha byte of each entry is set from `opacityData`
   * (or 0 when the item is invisible according to `visibilityData`).
   *
   * @param ids - Ordered list of item IDs to resolve
   * @param colorConfig - The color configuration describing the data source
   * @param colorMaps - Named maps from group strings to {@link Color} values
   * @param defaultColor - Fallback color used when a value cannot be resolved
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options.signal - Optional abort signal
   * @param options.align - Optional alignment for the output array length
   * @param visibilityData - Resolved visibility data produced by {@link resolveVisibilities}
   * @param opacityData - Resolved opacity data produced by {@link resolveOpacities}
   * @returns A `Uint32Array` of length `align(ids.length, align)` with packed RGBA colors
   */
  static async resolveColors(
    ids: number[],
    colorConfig: ColorConfig,
    colorMaps: DefaultMap<Color>[],
    defaultColor: Color,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, align }: { signal?: AbortSignal; align?: number } = {},
    visibilityData: Uint8Array,
    opacityData: Uint8Array,
  ): Promise<Uint32Array> {
    signal?.throwIfAborted();
    const encodeColor = (color: Color) => ColorUtils.packColor(color);
    const data = new Uint32Array(MathUtils.align(ids.length, align ?? 1));
    const activeConfigSource = getActiveConfigSource(colorConfig);
    if (activeConfigSource === "constant" && isConstantConfig(colorConfig)) {
      data.fill(encodeColor(colorConfig.constant.value), 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(colorConfig)) {
      const colorPalette = colorPalettes.find(
        (colorPalette) => colorPalette.id === colorConfig.from.palette,
      );
      if (colorPalette !== undefined) {
        let range = colorConfig.from.range;
        const parseColor = (
          tableValue: unknown,
          tableValues: MappableArrayLike<unknown>,
        ) => {
          if (range === undefined) {
            range = MathUtils.getRange(tableValues);
            if (range === undefined || range[0] >= range[1]) {
              console.warn("Invalid color value range, using [0, 1] instead");
              range = [0, 1];
            }
          }
          if (typeof tableValue === "number") {
            const vnorm = (tableValue - range[0]) / (range[1] - range[0]);
            const index = MathUtils.clamp(
              Math.floor(vnorm * colorPalette.colors.length),
              0,
              colorPalette.colors.length - 1,
            );
            return colorPalette.colors[index]!;
          }
          console.warn(`Invalid color table value: ${String(tableValue)}`);
          return undefined;
        };
        await ResolveUtils.fillFrom(
          data,
          ids,
          colorConfig,
          loadTable,
          parseColor,
          defaultColor,
          encodeColor,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        console.warn(`Color palette ${colorConfig.from.palette} not found`);
        data.fill(encodeColor(defaultColor), 0, ids.length);
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(colorConfig)
    ) {
      let colorMap, colorPalette;
      if (colorConfig.groupBy.map !== undefined) {
        colorMap = colorMaps.find((m) => m.id === colorConfig.groupBy.map);
        if (colorMap === undefined) {
          console.warn(`Color map ${colorConfig.groupBy.map} not found`);
        }
      } else if (colorConfig.groupBy.palette !== undefined) {
        colorPalette = colorPalettes.find(
          (p) => p.id === colorConfig.groupBy.palette,
        );
        if (colorPalette === undefined) {
          console.warn(
            `Color palette ${colorConfig.groupBy.palette} not found`,
          );
        }
      } else {
        console.warn(`No color map or color palette specified`);
      }
      if (colorConfig.groupBy.map !== undefined && colorMap !== undefined) {
        const groupColors = new Map(Object.entries(colorMap.values));
        const defaultGroupColor = colorMap.default;
        const mapToColor = (tableGroup: string) =>
          groupColors.get(tableGroup) ?? defaultGroupColor;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          colorConfig,
          loadTable,
          mapToColor,
          defaultColor,
          encodeColor,
          { signal },
        );
        signal?.throwIfAborted();
      } else if (
        colorConfig.groupBy.palette !== undefined &&
        colorPalette !== undefined
      ) {
        const colors = colorPalette.colors;
        const mapToColor = (tableGroup: string) =>
          colors[HashUtils.djb2(tableGroup) % colors.length]!;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          colorConfig,
          loadTable,
          mapToColor,
          defaultColor,
          encodeColor,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        data.fill(encodeColor(defaultColor), 0, ids.length);
      }
    } else if (activeConfigSource === "random" && isRandomConfig(colorConfig)) {
      const colorPalette = colorPalettes.find(
        (colorPalette) => colorPalette.id === colorConfig.random.palette,
      );
      if (colorPalette !== undefined) {
        for (let i = 0; i < ids.length; i++) {
          data[i] = encodeColor(
            colorPalette.colors[
              MathUtils.clamp(
                Math.floor(Math.random() * colorPalette.colors.length),
                0,
                colorPalette.colors.length - 1,
              )
            ]!,
          );
        }
      } else {
        console.warn(`Color palette ${colorConfig.random.palette} not found`);
        data.fill(encodeColor(defaultColor), 0, ids.length);
      }
    } else {
      console.warn("No valid color config found, using default color");
      data.fill(encodeColor(defaultColor), 0, ids.length);
    }
    for (let i = 0; i < ids.length; i++) {
      const c = MathUtils.safeLeftShift(data[i]!, 8);
      data[i] = c + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
    }
    return data;
  }

  /**
   * Resolves a `Uint8Array` of visibility values (0 or 1) for the given item IDs
   *
   * Supports constant, `from`-column (truthy when value > 0), and `groupBy`-column config sources.
   * Table values are parsed as numeric visibility flags (0 = invisible, otherwise visible).
   * When mapping from a group-by column, group keys are JSON-stringified and mapped to visibility via a provided visibility map.
   * If a mapping is missing or parsing fails, the `defaultVisibility` is used instead.
   *
   * @param ids - Ordered list of item IDs to resolve
   * @param visibilityConfig - The visibility configuration describing the data source
   * @param visibilityMaps - Named maps from group strings to boolean visibility values
   * @param defaultVisibility - Fallback visibility used when a value cannot be resolved
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options.signal - Optional abort signal
   * @param options.align - Optional alignment for the output array length
   * @returns A `Uint8Array` of length `align(ids.length, align)` with visibility flags
   */
  static async resolveVisibilities(
    ids: number[],
    visibilityConfig: VisibilityConfig,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, align }: { signal?: AbortSignal; align?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const encodeVisibility = (visibility: boolean) => (visibility ? 1 : 0);
    const data = new Uint8Array(MathUtils.align(ids.length, align ?? 1));
    const activeConfigSource = getActiveConfigSource(visibilityConfig);
    if (
      activeConfigSource === "constant" &&
      isConstantConfig(visibilityConfig)
    ) {
      data.fill(
        encodeVisibility(visibilityConfig.constant.value),
        0,
        ids.length,
      );
    } else if (
      activeConfigSource === "from" &&
      isFromConfig(visibilityConfig)
    ) {
      const parseVisibility = (tableValue: unknown) => {
        if (typeof tableValue === "number") {
          return tableValue > 0;
        }
        console.warn(`Invalid visibility table value: ${String(tableValue)}`);
        return undefined;
      };
      await ResolveUtils.fillFrom(
        data,
        ids,
        visibilityConfig,
        loadTable,
        parseVisibility,
        defaultVisibility,
        encodeVisibility,
        { signal },
      );
      signal?.throwIfAborted();
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(visibilityConfig)
    ) {
      const visibilityMap = visibilityMaps.find(
        (m) => m.id === visibilityConfig.groupBy.map,
      );
      if (visibilityMap !== undefined) {
        const groupVisibilities = new Map(Object.entries(visibilityMap.values));
        const mapToVisibility = (tableGroup: string) =>
          groupVisibilities.get(tableGroup) ?? visibilityMap.default;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          visibilityConfig,
          loadTable,
          mapToVisibility,
          defaultVisibility,
          encodeVisibility,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        console.warn(
          `Visibility map ${visibilityConfig.groupBy.map} not found`,
        );
        data.fill(encodeVisibility(defaultVisibility), 0, ids.length);
      }
    } else {
      data.fill(encodeVisibility(defaultVisibility), 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves a `Uint8Array` of opacity values (0–255) for the given item IDs
   *
   * Supports constant, `from`-column, and `groupBy`-column config sources.
   * Table values are parsed as numeric opacities in the [0, 1] range. When mapping from a group-by column,
   * group keys are JSON-stringified and mapped to opacity values via a provided opacity map.
   * If a mapping is missing or parsing fails, the `defaultOpacity` is used instead.
   * Each resolved opacity in `[0, 1]` is multiplied by `opacityFactor`, then scaled to the `[0, 255]` byte range.
   *
   * @param ids - Ordered list of item IDs to resolve
   * @param opacityConfig - The opacity configuration describing the data source
   * @param opacityMaps - Named maps from group strings to numeric opacity values in `[0, 1]`
   * @param defaultOpacity - Fallback opacity in `[0, 1]` used when a value cannot be resolved
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options.signal - Optional abort signal
   * @param options.align - Optional alignment for the output array length
   * @param options.opacityFactor - Scalar applied before converting to bytes (default `1`)
   * @returns A `Uint8Array` of length `align(ids.length, align)` with byte-scaled opacities
   */
  static async resolveOpacities(
    ids: number[],
    opacityConfig: OpacityConfig,
    opacityMaps: DefaultMap<number>[],
    defaultOpacity: number,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      align,
      opacityFactor = 1,
    }: {
      signal?: AbortSignal;
      align?: number;
      opacityFactor?: number;
    } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();

    const encodeOpacity = (opacity: number) =>
      MathUtils.clamp(Math.round(opacity * opacityFactor * 255), 0, 255);
    const data = new Uint8Array(MathUtils.align(ids.length, align ?? 1));
    const activeConfigSource = getActiveConfigSource(opacityConfig);
    if (activeConfigSource === "constant" && isConstantConfig(opacityConfig)) {
      data.fill(encodeOpacity(opacityConfig.constant.value), 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(opacityConfig)) {
      const parseOpacity = (tableValue: unknown) => {
        if (typeof tableValue === "number") {
          return MathUtils.clamp(tableValue, 0, 1);
        }
        console.warn(`Invalid opacity table value: ${String(tableValue)}`);
        return undefined;
      };
      await ResolveUtils.fillFrom(
        data,
        ids,
        opacityConfig,
        loadTable,
        parseOpacity,
        defaultOpacity,
        encodeOpacity,
        { signal },
      );
      signal?.throwIfAborted();
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(opacityConfig)
    ) {
      const opacityMap = opacityMaps.find(
        (m) => m.id === opacityConfig.groupBy.map,
      );
      if (opacityMap !== undefined) {
        const groupOpacities = new Map(Object.entries(opacityMap.values));
        const mapToOpacity = (tableGroup: string) =>
          groupOpacities.get(tableGroup) ?? opacityMap.default;
        await ResolveUtils.fillGroupBy(
          data,
          ids,
          opacityConfig,
          loadTable,
          mapToOpacity,
          defaultOpacity,
          encodeOpacity,
          { signal },
        );
        signal?.throwIfAborted();
      } else {
        console.warn(`Opacity map ${opacityConfig.groupBy.map} not found`);
        data.fill(encodeOpacity(defaultOpacity), 0, ids.length);
      }
    } else {
      data.fill(encodeOpacity(defaultOpacity), 0, ids.length);
    }
    return data;
  }

  /**
   * Fills `data` by loading values from the configured table column
   *
   * For each ID in `ids`, the corresponding row is looked up in the loaded table by ID.
   * The raw cell value is parsed by `parseTableValue`; if parsing fails, `defaultValue` is used instead.
   *
   * @param data - Output typed array to fill
   * @param ids - Ordered list of item IDs
   * @param config - A `FromConfig` specifying the source table and column
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param parseTableValue - Converts a raw cell value to `TValue`, or `undefined` on failure
   * @param defaultValue - Value used when the ID is missing or parsing fails
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  private static async fillFrom<TValue>(
    data: TypedArray,
    ids: number[],
    config: FromConfig,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    parseTableValue: (
      tableValue: unknown,
      tableValues: MappableArrayLike<unknown>,
    ) => TValue | undefined,
    defaultValue: TValue,
    encodeValue: (value: TValue) => number,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const tableData = await loadTable(config.from.table, { signal });
    signal?.throwIfAborted();
    const tableIds = tableData.getIndex();
    const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
    const tableValues = await tableData.loadColumn(config.from.column, {
      signal,
    });
    signal?.throwIfAborted();
    ids.forEach((id, i) => {
      const tableIndex = tableIndices.get(id);
      if (tableIndex !== undefined) {
        const value = parseTableValue(tableValues[tableIndex], tableValues);
        data[i] = encodeValue(value ?? defaultValue);
      } else {
        console.warn(`ID ${id} missing in table ${config.from.table}`);
        data[i] = encodeValue(defaultValue);
      }
    });
  }

  /**
   * Fills `data` by loading group keys from the configured table column and mapping them to values.
   *
   * For each ID in `ids`, the corresponding row is looked up in the loaded table by ID.
   * The raw cell value is JSON-stringified to produce a group key, which is then mapped to a value using `mapTableGroup`.
   * If the mapping fails, `defaultValue` is used instead.
   *
   * @param data - Output typed array to fill
   * @param ids - Ordered list of item IDs
   * @param config - A `GroupByConfig` specifying the source table and column
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param mapTableGroup - Maps a JSON-stringified group key to `TValue`, or `undefined`
   * @param defaultValue - Value used when the ID is missing or the group is unmapped
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  private static async fillGroupBy<TValue, TMapRequired extends boolean>(
    data: TypedArray,
    ids: number[],
    config: GroupByConfig<TMapRequired>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    mapTableGroup: (tableGroup: string) => TValue | undefined,
    defaultValue: TValue,
    encodeValue: (value: TValue) => number,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const tableData = await loadTable(config.groupBy.table, { signal });
    signal?.throwIfAborted();
    const tableIds = tableData.getIndex();
    const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
    const tableGroups = await tableData.loadColumn(config.groupBy.column, {
      signal,
    });
    signal?.throwIfAborted();
    ids.forEach((id, i) => {
      const tableIndex = tableIndices.get(id);
      if (tableIndex !== undefined) {
        const group = JSON.stringify(tableGroups[tableIndex]!);
        const value = mapTableGroup(group) ?? defaultValue;
        data[i] = encodeValue(value);
      } else {
        console.warn(`ID ${id} missing in table ${config.groupBy.table}`);
        data[i] = encodeValue(defaultValue);
      }
    });
  }
}
