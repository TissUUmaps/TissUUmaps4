import { TableData } from "../data/table";
import { COLOR_PALETTES, MARKER_PALETTE } from "../palettes";
import {
  Color,
  ColorMap,
  Marker,
  TableGroupsColumn,
  TableValuesColumn,
  ValueMap,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../types";
import ColorUtils from "./ColorUtils";
import HashUtils from "./HashUtils";

export default class LoadUtils {
  static async loadMarkerIndexData(
    n: number,
    markerConfig: Marker | TableValuesColumn | TableGroupsColumn | "random",
    markerMapConfig: string | ValueMap<Marker> | undefined,
    defaultMarker: Marker,
    markerMaps: Map<string, ValueMap<Marker>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint8Array> {
    const { signal, paddingMultiple } = options;
    signal?.throwIfAborted();
    let dataLength = n;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesColumn(markerConfig)) {
      // table column contains marker values
      const tableData = await loadTableByID(markerConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<string>(
        markerConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = Marker[tableValues[i]! as keyof typeof Marker];
      }
    } else if (isTableGroupsColumn(markerConfig)) {
      // table column contains group names
      const tableData = await loadTableByID(markerConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(markerConfig.groupsCol, {
        signal,
      });
      signal?.throwIfAborted();
      let markerMap;
      if (markerMapConfig !== undefined) {
        markerMap =
          typeof markerMapConfig === "string"
            ? markerMaps.get(markerMapConfig)
            : markerMapConfig;
      }
      if (markerMap !== undefined) {
        // marker map found, map group names to markers
        const groupValues = new Map(Object.entries(markerMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const marker =
            groupValues.get(group) ?? // first, try to get group-specific marker
            markerMap.defaultValue ?? // then, fallback to marker map default
            defaultMarker; // finally, fallback to default marker
          data[i] = marker;
        }
      } else {
        // no marker map found, fallback to marker palette
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          data[i] =
            MARKER_PALETTE[HashUtils.djb2(group) % MARKER_PALETTE.length]!;
        }
      }
    } else if (markerConfig === "random") {
      // random markers from marker palette
      for (let i = 0; i < n; i++) {
        data[i] =
          MARKER_PALETTE[Math.floor(Math.random() * MARKER_PALETTE.length)]!;
      }
    } else {
      // uniform marker
      data.fill(markerConfig);
    }
    return data;
  }

  static async loadSizeData(
    n: number,
    sizeConfig: number | TableValuesColumn | TableGroupsColumn,
    sizeMapConfig: string | ValueMap<number> | undefined,
    defaultSize: number,
    sizeMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: {
      signal?: AbortSignal;
      paddingMultiple?: number;
      sizeFactor?: number;
    } = {},
  ): Promise<Float32Array> {
    const { signal, paddingMultiple, sizeFactor = 1.0 } = options;
    signal?.throwIfAborted();
    let dataLength = n;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Float32Array(dataLength);
    if (isTableValuesColumn(sizeConfig)) {
      // table column contains size values
      const tableData = await loadTableByID(sizeConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        sizeConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = tableValues[i]! * sizeFactor;
      }
    } else if (isTableGroupsColumn(sizeConfig)) {
      // table column contains group names
      let sizeMap = undefined;
      if (sizeMapConfig !== undefined) {
        sizeMap =
          typeof sizeMapConfig === "string"
            ? sizeMaps.get(sizeMapConfig)
            : sizeMapConfig;
      }
      if (sizeMap !== undefined) {
        // size map found, load group names
        const tableData = await loadTableByID(sizeConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(sizeConfig.groupsCol, {
          signal,
        });
        signal?.throwIfAborted();
        // map group names to sizes
        const groupValues = new Map(Object.entries(sizeMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const size =
            groupValues.get(group) ?? // first, try to get group-specific size
            sizeMap.defaultValue ?? // then, fallback to size map default
            defaultSize; // finally, fallback to default size
          data[i] = size * sizeFactor;
        }
      } else {
        // no size map found, fallback to default size
        data.fill(defaultSize * sizeFactor);
      }
    } else {
      // uniform size
      data.fill(sizeConfig * sizeFactor);
    }
    return data;
  }

  static async loadColorData(
    n: number,
    colorConfig:
      | Color
      | TableValuesColumn
      | TableGroupsColumn
      | "randomFromPalette",
    colorRangeConfig: [number, number] | undefined,
    colorPaletteConfig: keyof typeof COLOR_PALETTES | undefined,
    colorMapConfig: string | ColorMap | undefined,
    defaultColor: Color,
    visibilityData: Uint8Array,
    opacityData: Uint8Array,
    colorMaps: Map<string, ColorMap>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint32Array> {
    const { signal, paddingMultiple } = options;
    signal?.throwIfAborted();
    let dataLength = n;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint32Array(dataLength);
    if (isTableValuesColumn(colorConfig)) {
      // table column contains continuous values
      const palette =
        colorPaletteConfig !== undefined
          ? COLOR_PALETTES[colorPaletteConfig]
          : undefined;
      if (palette !== undefined) {
        // color palette found, load values
        const tableData = await loadTableByID(colorConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableValues = await tableData.loadColumn<number>(
          colorConfig.valuesCol,
          { signal },
        );
        signal?.throwIfAborted();
        // determine value range
        let vmin, vmax;
        if (colorRangeConfig !== undefined) {
          [vmin, vmax] = colorRangeConfig;
        } else {
          vmin = tableValues[0]!;
          vmax = tableValues[0]!;
          for (let i = 1; i < tableValues.length; i++) {
            const value = tableValues[i]!;
            if (value < vmin) {
              vmin = value;
            }
            if (value > vmax) {
              vmax = value;
            }
          }
        }
        // map values to colors
        for (let i = 0; i < tableValues.length; i++) {
          let value = tableValues[i]!;
          // clamp value to [vmin, vmax]
          if (value < vmin) {
            value = vmin!;
          } else if (value > vmax) {
            value = vmax!;
          }
          // rescale and map value to color
          value = (value - vmin) / (vmax - vmin);
          const color = palette[Math.floor(value * palette.length)]!;
          data[i] = ColorUtils.packColor(color);
        }
      } else {
        // no color palette found, fallback to default color
        data.fill(ColorUtils.packColor(defaultColor));
      }
    } else if (isTableGroupsColumn(colorConfig)) {
      // table column contains group names
      let colorMap = undefined;
      if (colorMapConfig !== undefined) {
        colorMap =
          typeof colorMapConfig === "string"
            ? colorMaps.get(colorMapConfig)
            : colorMapConfig;
      }
      if (colorMap !== undefined) {
        // color map found, load group names
        const tableData = await loadTableByID(colorConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(colorConfig.groupsCol, {
          signal,
        });
        signal?.throwIfAborted();
        // map group names to colors
        const palette =
          colorMap.palette !== undefined
            ? COLOR_PALETTES[colorMap.palette]
            : undefined;
        const groupValues = new Map(Object.entries(colorMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const color =
            groupValues.get(group) ?? // first, try to get group-specific color
            palette?.[HashUtils.djb2(group) % palette.length] ?? // then, fallback to color map palette
            colorMap.defaultValue ?? // then, fallback to color map default
            defaultColor; // finally, fallback to default color
          data[i] = ColorUtils.packColor(color);
        }
      } else {
        // no color map found, fallback to default color
        data.fill(ColorUtils.packColor(defaultColor));
      }
    } else if (colorConfig === "randomFromPalette") {
      // random colors from color palette
      const palette =
        colorPaletteConfig !== undefined
          ? COLOR_PALETTES[colorPaletteConfig]
          : undefined;
      if (palette !== undefined) {
        // color palette found, map random colors from palette
        for (let i = 0; i < n; i++) {
          const color = palette[Math.floor(Math.random() * palette.length)]!;
          data[i] = ColorUtils.packColor(color);
        }
      } else {
        // no color palette found, fallback to default color
        data.fill(ColorUtils.packColor(defaultColor));
      }
    } else {
      // uniform color
      data.fill(ColorUtils.packColor(colorConfig));
    }
    // combine color with visibility and opacity
    signal?.throwIfAborted();
    for (let i = 0; i < n; i++) {
      // bitwise operators coerce operands to signed 32-bit integers,
      // so we need to use the unsigned right shift operator >>> 0
      // to convert large results back to unsigned 32-bit integers
      const c = (data[i]! << 8) >>> 0;
      data[i] = c + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
    }
    return data;
  }

  static async loadVisibilityData(
    n: number,
    visibilityConfig: boolean | TableValuesColumn | TableGroupsColumn,
    visibilityMapConfig: string | ValueMap<boolean> | undefined,
    defaultVisibility: boolean,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint8Array> {
    const { signal, paddingMultiple } = options;
    signal?.throwIfAborted();
    let dataLength = n;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesColumn(visibilityConfig)) {
      // table column contains visibility values
      const tableData = await loadTableByID(visibilityConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        visibilityConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      data.set(tableValues);
    } else if (isTableGroupsColumn(visibilityConfig)) {
      // table column contains group names
      let visibilityMap = undefined;
      if (visibilityMapConfig !== undefined) {
        visibilityMap =
          typeof visibilityMapConfig === "string"
            ? visibilityMaps.get(visibilityMapConfig)
            : visibilityMapConfig;
      }
      if (visibilityMap !== undefined) {
        // visibility map found, load group names
        const tableData = await loadTableByID(visibilityConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(
          visibilityConfig.groupsCol,
          { signal },
        );
        signal?.throwIfAborted();
        // map group names to visibilities
        const groupValues = new Map(Object.entries(visibilityMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const visibility =
            groupValues.get(group) ?? // first, try to get group-specific visibility
            visibilityMap.defaultValue ?? // then, fallback to visibility map default
            defaultVisibility; // finally, fallback to default visibility
          data[i] = visibility ? 1 : 0;
        }
      } else {
        // no visibility map found, fallback to default visibility
        data.fill(defaultVisibility ? 1 : 0);
      }
    } else {
      // uniform visibility
      data.fill(visibilityConfig ? 1 : 0);
    }
    return data;
  }

  static async loadOpacityData(
    n: number,
    opacityConfig: number | TableValuesColumn | TableGroupsColumn,
    opacityMapConfig: string | ValueMap<number> | undefined,
    defaultOpacity: number,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: {
      signal?: AbortSignal;
      paddingMultiple?: number;
      opacityFactor?: number;
    } = {},
  ): Promise<Uint8Array> {
    const { signal, paddingMultiple, opacityFactor = 1.0 } = options;
    signal?.throwIfAborted();
    let dataLength = n;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesColumn(opacityConfig)) {
      // table column contains opacity values
      const tableData = await loadTableByID(opacityConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        opacityConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = Math.round(opacityFactor * tableValues[i]! * 255);
      }
    } else if (isTableGroupsColumn(opacityConfig)) {
      // table column contains group names
      let opacityMap = undefined;
      if (opacityMapConfig !== undefined) {
        opacityMap =
          typeof opacityMapConfig === "string"
            ? opacityMaps.get(opacityMapConfig)
            : opacityMapConfig;
      }
      if (opacityMap !== undefined) {
        // opacity map found, load group names
        const tableData = await loadTableByID(opacityConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(
          opacityConfig.groupsCol,
          { signal },
        );
        signal?.throwIfAborted();
        // map group names to opacities
        const groupValues = new Map(Object.entries(opacityMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const opacity =
            groupValues.get(group) ?? // first, try to get group-specific opacity
            opacityMap.defaultValue ?? // then, fallback to opacity map default
            defaultOpacity; // finally, fallback to default opacity
          data[i] = Math.round(opacityFactor * opacity * 255);
        }
      } else {
        // no opacity map found, fallback to default opacity
        data.fill(Math.round(opacityFactor * defaultOpacity * 255));
      }
    } else {
      // uniform opacity
      data.fill(Math.round(opacityFactor * opacityConfig * 255));
    }
    return data;
  }
}
