import {
  type ColorConfig,
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
import { type Color, type DefaultMap, Marker } from "../model/types";
import { colorPalettes, markerPalette } from "../palettes";
import { type TableData } from "../storage/table";
import { ColorUtils } from "./ColorUtils";
import { HashUtils } from "./HashUtils";
import { MathUtils } from "./MathUtils";

/**
 * Utility methods for resolving per-item visual properties
 * (marker, size, color, visibility, opacity) from configuration objects
 *
 * Each method supports constant, from-column, group-by, and (where
 * applicable) random configuration sources, and produces a typed array
 * suitable for direct GPU buffer upload.
 */
export class LoadUtils {
  /**
   * Resolves per-item marker indices from a {@link MarkerConfig}
   *
   * @param ids - Item IDs to resolve
   * @param markerConfig - Marker configuration
   * @param markerMaps - Project-global marker maps
   * @param defaultMarker - Fallback marker when no configuration matches
   * @param loadTable - Async table loader
   * @param options - Optional abort signal and output padding
   */
  static async loadMarkerData(
    ids: number[],
    markerConfig: MarkerConfig,
    markerMaps: DefaultMap<Marker>[],
    defaultMarker: Marker,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, padding }: { signal?: AbortSignal; padding?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint8Array(dataLength);
    const activeConfigSource = getActiveConfigSource(markerConfig);
    if (activeConfigSource === "constant" && isConstantConfig(markerConfig)) {
      // use a uniform marker
      const marker = markerConfig.constant.value;
      const markerIndex = marker as number;
      data.fill(markerIndex, 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(markerConfig)) {
      // load table column
      const tableData = await loadTable(markerConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        markerConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      // map IDs to markers
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const markerIndex = tableValues[tableIndex]!;
          data[i] = markerIndex;
        } else {
          // ID not found in table --> use default marker
          console.warn(`ID ${id} missing in table ${markerConfig.from.table}`);
          const markerIndex = defaultMarker as number;
          data[i] = markerIndex;
        }
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(markerConfig)
    ) {
      // load marker map
      let markerMap;
      if (markerConfig.groupBy.map !== undefined) {
        const m = markerMaps.find((m) => m.id === markerConfig.groupBy.map);
        if (m !== undefined) {
          markerMap = {
            values: new Map(Object.entries(m.values)),
            default: m.default,
          };
        } else {
          console.warn(`Marker map ${markerConfig.groupBy.map} not found`);
          markerMap = "notfound" as const;
        }
      }
      if (markerMap === "notfound") {
        // marker map not found --> use default marker
        const markerIndex = defaultMarker as number;
        data.fill(markerIndex, 0, ids.length);
      } else {
        // load table column
        const tableData = await loadTable(markerConfig.groupBy.table, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          markerConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        // map IDs to group names and then to markers
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            let marker;
            if (markerMap !== undefined) {
              marker =
                markerMap.values.get(group) ?? // first, try to get group-specific marker
                markerMap.default ?? // then, fallback to marker map default
                defaultMarker; // finally, fallback to default marker
            } else {
              // no marker map --> use hash of group name to select a marker
              const hash = HashUtils.djb2(group);
              marker = markerPalette[hash % markerPalette.length]!;
            }
            const markerIndex = marker as number;
            data[i] = markerIndex;
          } else {
            // ID not found in table --> use default marker
            console.warn(
              `ID ${id} missing in table ${markerConfig.groupBy.table}`,
            );
            const marker = markerMap?.default ?? defaultMarker;
            const markerIndex = marker as number;
            data[i] = markerIndex;
          }
        }
      }
    } else {
      // empty marker config --> use default marker
      const markerIndex = defaultMarker as number;
      data.fill(markerIndex, 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves per-item sizes from a {@link SizeConfig}
   *
   * @param ids - Item IDs to resolve
   * @param sizeConfig - Size configuration
   * @param sizeMaps - Project-global size maps
   * @param defaultSize - Fallback size when no configuration matches
   * @param loadTable - Async table loader
   * @param options - Optional abort signal, output padding, and size factor
   */
  static async loadSizeData(
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
      padding,
      sizeFactor = 1,
    }: {
      signal?: AbortSignal;
      padding?: number;
      sizeFactor?: number;
    } = {},
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Float32Array(dataLength);
    const activeConfigSource = getActiveConfigSource(sizeConfig);
    if (activeConfigSource === "constant" && isConstantConfig(sizeConfig)) {
      // use a uniform size
      const size = sizeConfig.constant.value;
      const scaledSize = size * sizeFactor;
      data.fill(scaledSize, 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(sizeConfig)) {
      // load table column
      const tableData = await loadTable(sizeConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        sizeConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      // map IDs to sizes
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const size = tableValues[tableIndex]!;
          const scaledSize = size * sizeFactor;
          data[i] = scaledSize;
        } else {
          // ID not found in table --> use default size
          console.warn(`ID ${id} missing in table ${sizeConfig.from.table}`);
          const scaledSize = defaultSize * sizeFactor;
          data[i] = scaledSize;
        }
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(sizeConfig)
    ) {
      // load size map
      let sizeMap;
      if (sizeConfig.groupBy.map !== undefined) {
        const m = sizeMaps.find((m) => m.id === sizeConfig.groupBy.map);
        if (m !== undefined) {
          sizeMap = {
            values: new Map(Object.entries(m.values)),
            default: m.default,
          };
        } else {
          console.warn(`Size map ${sizeConfig.groupBy.map} not found`);
          sizeMap = "notfound" as const;
        }
      }
      if (sizeMap === undefined || sizeMap === "notfound") {
        // no size map or size map not found --> use default size
        const scaledSize = defaultSize * sizeFactor;
        data.fill(scaledSize, 0, ids.length);
      } else {
        // load table column
        const tableData = await loadTable(sizeConfig.groupBy.table, { signal });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          sizeConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        // map IDs to group names and then to sizes
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const size =
              sizeMap.values.get(group) ?? // first, try to get group-specific size
              sizeMap.default ?? // then, fallback to size map default
              defaultSize; // finally, fallback to default size
            const scaledSize = size * sizeFactor;
            data[i] = scaledSize;
          } else {
            // ID not found in table --> use default size
            console.warn(
              `ID ${id} missing in table ${sizeConfig.groupBy.table}`,
            );
            const size = sizeMap.default ?? defaultSize;
            const scaledSize = size * sizeFactor;
            data[i] = scaledSize;
          }
        }
      }
    } else {
      // empty size config --> use default size
      const scaledSize = defaultSize * sizeFactor;
      data.fill(scaledSize, 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves per-item packed RGBA colors from a {@link ColorConfig}
   *
   * The returned `Uint32Array` encodes each color as `(R << 24 | G << 16 | B << 8 | A)`
   * where alpha is derived from the provided `visibilityData` and `opacityData`.
   *
   * @param ids - Item IDs to resolve
   * @param colorConfig - Color configuration
   * @param colorMaps - Project-global color maps
   * @param defaultColor - Fallback color when no configuration matches
   * @param loadTable - Async table loader
   * @param options - Optional abort signal and output padding
   * @param visibilityData - Per-item visibility flags (0 or 1)
   * @param opacityData - Per-item opacity values (0–255)
   */
  static async loadColorData(
    ids: number[],
    colorConfig: ColorConfig,
    colorMaps: DefaultMap<Color>[],
    defaultColor: Color,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, padding }: { signal?: AbortSignal; padding?: number } = {},
    visibilityData: Uint8Array,
    opacityData: Uint8Array,
  ): Promise<Uint32Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint32Array(dataLength);
    const activeConfigSource = getActiveConfigSource(colorConfig);
    if (activeConfigSource === "constant" && isConstantConfig(colorConfig)) {
      // use a uniform color
      const color = colorConfig.constant.value;
      const packedColor = ColorUtils.packColor(color);
      data.fill(packedColor, 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(colorConfig)) {
      // load color palette
      const colorPalette = colorPalettes.find(
        (colorPalette) => colorPalette.id === colorConfig.from.palette,
      );
      if (colorPalette !== undefined) {
        // load table column
        const tableData = await loadTable(colorConfig.from.table, { signal });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableValues = await tableData.loadColumn<number>(
          colorConfig.from.column,
          { signal },
        );
        signal?.throwIfAborted();
        // compute value range
        let vmin, vmax;
        if (colorConfig.from.range !== undefined) {
          [vmin, vmax] = colorConfig.from.range;
        } else {
          for (const id of ids) {
            const tableIndex = tableIndices.get(id);
            if (tableIndex !== undefined) {
              const v = tableValues[tableIndex]!;
              if (vmin === undefined || v < vmin) {
                vmin = v;
              }
              if (vmax === undefined || v > vmax) {
                vmax = v;
              }
            }
          }
        }
        if (vmin === undefined || vmax === undefined || vmin >= vmax) {
          console.warn("Invalid color value range, using [0, 1] instead");
          [vmin, vmax] = [0, 1];
        }
        // map IDs to colors
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const v = tableValues[tableIndex]!;
            const vnorm = (v - vmin) / (vmax - vmin);
            const colorPaletteIndex = Math.min(
              Math.max(0, Math.floor(vnorm * colorPalette.colors.length)),
              colorPalette.colors.length - 1,
            );
            const color = colorPalette.colors[colorPaletteIndex]!;
            const packedColor = ColorUtils.packColor(color);
            data[i] = packedColor;
          } else {
            // ID not found in table --> use default color
            console.warn(`ID ${id} missing in table ${colorConfig.from.table}`);
            const packedColor = ColorUtils.packColor(defaultColor);
            data[i] = packedColor;
          }
        }
      } else {
        // color palette not found --> use default color
        console.warn(`Color palette ${colorConfig.from.palette} not found`);
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(colorConfig)
    ) {
      // load color map
      let colorMap;
      if (colorConfig.groupBy.map !== undefined) {
        const m = colorMaps.find((m) => m.id === colorConfig.groupBy.map);
        if (m !== undefined) {
          colorMap = {
            values: new Map(Object.entries(m.values)),
            default: m.default,
          };
        } else {
          console.warn(`Color map ${colorConfig.groupBy.map} not found`);
          colorMap = "notfound" as const;
        }
      }
      // load color palette
      let colorPalette;
      if (colorConfig.groupBy.palette !== undefined) {
        const p = colorPalettes.find(
          (p) => p.id === colorConfig.groupBy.palette,
        );
        if (p !== undefined) {
          colorPalette = p;
        } else {
          console.warn(
            `Color palette ${colorConfig.groupBy.palette} not found`,
          );
          colorPalette = "notfound" as const;
        }
      }
      if (colorMap === "notfound" || colorPalette === "notfound") {
        // color map or color palette not found --> use default color
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      } else if (colorMap !== undefined || colorPalette !== undefined) {
        // load table column
        const tableData = await loadTable(colorConfig.groupBy.table, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          colorConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        // map IDs to group names and then to colors
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            let color;
            if (colorMap !== undefined) {
              color =
                colorMap.values.get(group) ?? // first, try to get group-specific color
                colorMap.default ?? // then, fallback to color map default
                defaultColor; // finally, fallback to default color
            } else if (colorPalette !== undefined) {
              // no color map --> use hash of group name to select a color
              const hash = HashUtils.djb2(group);
              color = colorPalette.colors[hash % colorPalette.colors.length]!;
            } else {
              throw new Error("Unreachable");
            }
            const packedColor = ColorUtils.packColor(color);
            data[i] = packedColor;
          } else {
            // ID not found in table --> use default color
            console.warn(
              `ID ${id} missing in table ${colorConfig.groupBy.table}`,
            );
            const color = colorMap?.default ?? defaultColor;
            const packedColor = ColorUtils.packColor(color);
            data[i] = packedColor;
          }
        }
      } else {
        // no color map and no color palette --> use default color
        console.warn(`No color map or color palette specified`);
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else if (activeConfigSource === "random" && isRandomConfig(colorConfig)) {
      // load color palette
      const colorPalette = colorPalettes.find(
        (colorPalette) => colorPalette.id === colorConfig.random.palette,
      );
      if (colorPalette !== undefined) {
        // assign random colors
        for (let i = 0; i < ids.length; i++) {
          const colorIndex = Math.floor(
            Math.random() * colorPalette.colors.length,
          );
          const color = colorPalette.colors[colorIndex]!;
          const packedColor = ColorUtils.packColor(color);
          data[i] = packedColor;
        }
      } else {
        // color palette not found --> use default color
        console.warn(`Color palette ${colorConfig.random.palette} not found`);
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else {
      // empty color config --> use default color
      console.warn("No valid color config found, using default color");
      const packedColor = ColorUtils.packColor(defaultColor);
      data.fill(packedColor, 0, ids.length);
    }
    // combine color data with visibility and opacity data
    for (let i = 0; i < ids.length; i++) {
      const c = MathUtils.safeLeftShift(data[i]!, 8);
      data[i] = c + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
    }
    return data;
  }

  /**
   * Resolves per-item visibility flags from a {@link VisibilityConfig}
   *
   * @param ids - Item IDs to resolve
   * @param visibilityConfig - Visibility configuration
   * @param visibilityMaps - Project-global visibility maps
   * @param defaultVisibility - Fallback visibility when no configuration matches
   * @param loadTable - Async table loader
   * @param options - Optional abort signal and output padding
   */
  static async loadVisibilityData(
    ids: number[],
    visibilityConfig: VisibilityConfig,
    visibilityMaps: DefaultMap<boolean>[],
    defaultVisibility: boolean,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal, padding }: { signal?: AbortSignal; padding?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint8Array(dataLength);
    const activeConfigSource = getActiveConfigSource(visibilityConfig);
    if (
      activeConfigSource === "constant" &&
      isConstantConfig(visibilityConfig)
    ) {
      // use a uniform visibility
      const visibility = visibilityConfig.constant.value;
      const numericVisibility = visibility ? 1 : 0;
      data.fill(numericVisibility, 0, ids.length);
    } else if (
      activeConfigSource === "from" &&
      isFromConfig(visibilityConfig)
    ) {
      // load table column
      const tableData = await loadTable(visibilityConfig.from.table, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        visibilityConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      // map IDs to visibilities
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const numericVisibility = tableValues[tableIndex]!;
          data[i] = numericVisibility;
        } else {
          // ID not found in table --> use default visibility
          console.warn(
            `ID ${id} missing in table ${visibilityConfig.from.table}`,
          );
          const numericVisibility = defaultVisibility ? 1 : 0;
          data[i] = numericVisibility;
        }
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(visibilityConfig)
    ) {
      // load visibility map
      let visibilityMap;
      if (visibilityConfig.groupBy.map !== undefined) {
        const m = visibilityMaps.find(
          (m) => m.id === visibilityConfig.groupBy.map,
        );
        if (m !== undefined) {
          visibilityMap = {
            values: new Map(Object.entries(m.values)),
            default: m.default,
          };
        } else {
          console.warn(
            `Visibility map ${visibilityConfig.groupBy.map} not found`,
          );
          visibilityMap = "notfound" as const;
        }
      }
      if (visibilityMap === undefined || visibilityMap === "notfound") {
        // no visibility map or visibility map not found --> use default visibility
        const numericVisibility = defaultVisibility ? 1 : 0;
        data.fill(numericVisibility, 0, ids.length);
      } else {
        // load table column
        const tableData = await loadTable(visibilityConfig.groupBy.table, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          visibilityConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        // map IDs to group names and then to visibilities
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const visibility =
              visibilityMap.values.get(group) ?? // first, try to get group-specific visibility
              visibilityMap.default ?? // then, fallback to visibility map default
              defaultVisibility; // finally, fallback to default visibility
            const numericVisibility = visibility ? 1 : 0;
            data[i] = numericVisibility;
          } else {
            // ID not found in table --> use default visibility
            console.warn(
              `ID ${id} missing in table ${visibilityConfig.groupBy.table}`,
            );
            const visibility = visibilityMap.default ?? defaultVisibility;
            const numericVisibility = visibility ? 1 : 0;
            data[i] = numericVisibility;
          }
        }
      }
    } else {
      // empty visibility config --> use default visibility
      const numericVisibility = defaultVisibility ? 1 : 0;
      data.fill(numericVisibility, 0, ids.length);
    }
    return data;
  }

  /**
   * Resolves per-item opacity values from an {@link OpacityConfig}
   *
   * @param ids - Item IDs to resolve
   * @param opacityConfig - Opacity configuration
   * @param opacityMaps - Project-global opacity maps
   * @param defaultOpacity - Fallback opacity when no configuration matches
   * @param loadTable - Async table loader
   * @param options - Optional abort signal, output padding, and opacity factor
   */
  static async loadOpacityData(
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
      padding,
      opacityFactor = 1,
    }: {
      signal?: AbortSignal;
      padding?: number;
      opacityFactor?: number;
    } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint8Array(dataLength);
    const activeConfigSource = getActiveConfigSource(opacityConfig);
    if (activeConfigSource === "constant" && isConstantConfig(opacityConfig)) {
      // use a uniform opacity
      const opacity = opacityConfig.constant.value;
      const scaledOpacity = opacityFactor * opacity;
      const scaledOpacityInt = Math.min(
        Math.max(0, Math.round(scaledOpacity * 255)),
        255,
      );
      data.fill(scaledOpacityInt, 0, ids.length);
    } else if (activeConfigSource === "from" && isFromConfig(opacityConfig)) {
      // load table column
      const tableData = await loadTable(opacityConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        opacityConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      // map IDs to opacities
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const opacity = tableValues[tableIndex]!;
          const scaledOpacity = opacityFactor * opacity;
          const scaledOpacityInt = Math.min(
            Math.max(0, Math.round(scaledOpacity * 255)),
            255,
          );
          data[i] = scaledOpacityInt;
        } else {
          // ID not found in table --> use default opacity
          console.warn(`ID ${id} missing in table ${opacityConfig.from.table}`);
          const scaledOpacity = opacityFactor * defaultOpacity;
          const scaledOpacityInt = Math.min(
            Math.max(0, Math.round(scaledOpacity * 255)),
            255,
          );
          data[i] = scaledOpacityInt;
        }
      }
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(opacityConfig)
    ) {
      // load opacity map
      let opacityMap;
      if (opacityConfig.groupBy.map !== undefined) {
        const m = opacityMaps.find((m) => m.id === opacityConfig.groupBy.map);
        if (m !== undefined) {
          opacityMap = {
            values: new Map(Object.entries(m.values)),
            default: m.default,
          };
        } else {
          console.warn(`Opacity map ${opacityConfig.groupBy.map} not found`);
          opacityMap = "notfound" as const;
        }
      }
      if (opacityMap === undefined || opacityMap === "notfound") {
        // no opacity map or opacity map not found --> use default opacity
        const scaledOpacity = opacityFactor * defaultOpacity;
        const scaledOpacityInt = Math.min(
          Math.max(0, Math.round(scaledOpacity * 255)),
          255,
        );
        data.fill(scaledOpacityInt, 0, ids.length);
      } else {
        // load table column
        const tableData = await loadTable(opacityConfig.groupBy.table, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          opacityConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        // map IDs to group names and then to opacities
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const opacity =
              opacityMap.values.get(group) ?? // first, try to get group-specific opacity
              opacityMap.default ?? // then, fallback to opacity map default
              defaultOpacity; // finally, fallback to default opacity
            const scaledOpacity = opacityFactor * opacity;
            const scaledOpacityInt = Math.min(
              Math.max(0, Math.round(scaledOpacity * 255)),
              255,
            );
            data[i] = scaledOpacityInt;
          } else {
            // ID not found in table --> use default opacity
            console.warn(
              `ID ${id} missing in table ${opacityConfig.groupBy.table}`,
            );
            const opacity = opacityMap.default ?? defaultOpacity;
            const scaledOpacity = opacityFactor * opacity;
            const scaledOpacityInt = Math.min(
              Math.max(0, Math.round(scaledOpacity * 255)),
              255,
            );
            data[i] = scaledOpacityInt;
          }
        }
      }
    } else {
      // empty opacity config --> use default opacity
      const scaledOpacity = opacityFactor * defaultOpacity;
      const scaledOpacityInt = Math.min(
        Math.max(0, Math.round(scaledOpacity * 255)),
        255,
      );
      data.fill(scaledOpacityInt, 0, ids.length);
    }
    return data;
  }
}
