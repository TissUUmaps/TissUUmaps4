import { colorPalettes, markerPalette } from "../palettes";
import { type TableData } from "../storage/table";
import { type Color } from "../types/color";
import { Marker } from "../types/marker";
import {
  type TableGroupsRef,
  type TableValuesRef,
  isTableGroupsRef,
  isTableValuesRef,
} from "../types/tableRef";
import { type ColorMap, type ValueMap } from "../types/valueMap";
import { ColorUtils } from "./ColorUtils";
import { HashUtils } from "./HashUtils";
import { MathUtils } from "./MathUtils";

export class LoadUtils {
  static async loadMarkerIndexData(
    ids: number[],
    markerConfig: Marker | TableValuesRef | TableGroupsRef | "random",
    markerMapConfig: string | ValueMap<Marker> | undefined,
    defaultMarker: Marker,
    markerMaps: Map<string, ValueMap<Marker>>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      paddingMultiple,
    }: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesRef(markerConfig)) {
      // table column contains marker values
      const tableData = await loadTable(markerConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<string>(
        markerConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          data[i] = Marker[tableValues[tableIndex]! as keyof typeof Marker];
        } else {
          console.warn(`ID ${id} not found in table ${markerConfig.tableId}`);
          data[i] = defaultMarker;
        }
      }
    } else if (isTableGroupsRef(markerConfig)) {
      // table column contains group names
      let markerMap;
      if (markerMapConfig !== undefined) {
        const configuredMarkerMap =
          typeof markerMapConfig === "string"
            ? markerMaps.get(markerMapConfig)
            : markerMapConfig;
        if (configuredMarkerMap !== undefined) {
          markerMap = {
            values: new Map(Object.entries(configuredMarkerMap.values)),
            defaultValue: configuredMarkerMap.defaultValue,
          };
        } else {
          console.warn(`Marker map ${markerMapConfig as string} not found`);
        }
      }
      const tableData = await loadTable(markerConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableGroups = await tableData.loadColumn(markerConfig.groupsCol, {
        signal,
      });
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const group = JSON.stringify(tableGroups[tableIndex]!);
          if (markerMap !== undefined) {
            data[i] =
              markerMap.values.get(group) ?? // first, try to get group-specific marker
              markerMap.defaultValue ?? // then, fallback to marker map default
              defaultMarker; // finally, fallback to default marker
          } else {
            data[i] =
              markerPalette[HashUtils.djb2(group) % markerPalette.length]!;
          }
        } else {
          console.warn(`ID ${id} not found in table ${markerConfig.tableId}`);
          data[i] = defaultMarker;
        }
      }
    } else if (markerConfig === "random") {
      // random markers from marker palette
      for (let i = 0; i < ids.length; i++) {
        data[i] =
          markerPalette[Math.floor(Math.random() * markerPalette.length)]!;
      }
    } else {
      // uniform marker
      data.fill(markerConfig, 0, ids.length);
    }
    return data;
  }

  static async loadSizeData(
    ids: number[],
    sizeConfig: number | TableValuesRef | TableGroupsRef,
    sizeMapConfig: string | ValueMap<number> | undefined,
    defaultSize: number,
    sizeMaps: Map<string, ValueMap<number>>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      paddingMultiple,
      sizeFactor = 1,
    }: {
      signal?: AbortSignal;
      paddingMultiple?: number;
      sizeFactor?: number;
    } = {},
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Float32Array(dataLength);
    if (isTableValuesRef(sizeConfig)) {
      // table column contains size values
      const tableData = await loadTable(sizeConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        sizeConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          data[i] = tableValues[tableIndex]! * sizeFactor;
        } else {
          console.warn(`ID ${id} not found in table ${sizeConfig.tableId}`);
          data[i] = defaultSize * sizeFactor;
        }
      }
    } else if (isTableGroupsRef(sizeConfig)) {
      // table column contains group names
      let sizeMap;
      if (sizeMapConfig !== undefined) {
        const configuredSizeMap =
          typeof sizeMapConfig === "string"
            ? sizeMaps.get(sizeMapConfig)
            : sizeMapConfig;
        if (configuredSizeMap !== undefined) {
          sizeMap = {
            values: new Map(Object.entries(configuredSizeMap.values)),
            defaultValue: configuredSizeMap.defaultValue,
          };
        } else {
          console.warn(`Size map ${sizeMapConfig as string} not found`);
        }
      }
      if (sizeMap !== undefined) {
        const tableData = await loadTable(sizeConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(sizeConfig.groupsCol, {
          signal,
        });
        signal?.throwIfAborted();
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const size =
              sizeMap.values.get(group) ?? // first, try to get group-specific size
              sizeMap.defaultValue ?? // then, fallback to size map default
              defaultSize; // finally, fallback to default size
            data[i] = size * sizeFactor;
          } else {
            console.warn(`ID ${id} not found in table ${sizeConfig.tableId}`);
            data[i] = defaultSize * sizeFactor;
          }
        }
      } else {
        console.warn("Size map not configured or found");
        data.fill(defaultSize * sizeFactor, 0, ids.length);
      }
    } else {
      // uniform size
      data.fill(sizeConfig * sizeFactor, 0, ids.length);
    }
    return data;
  }

  static async loadColorData(
    ids: number[],
    colorConfig: Color | TableValuesRef | TableGroupsRef | "randomFromPalette",
    colorRangeConfig: [number, number] | "minmax" | undefined,
    colorPaletteConfig: keyof typeof colorPalettes | undefined,
    colorMapConfig: string | ColorMap | undefined,
    defaultColor: Color,
    visibilityData: Uint8Array,
    opacityData: Uint8Array,
    colorMaps: Map<string, ColorMap>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      paddingMultiple,
    }: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint32Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint32Array(dataLength);
    if (isTableValuesRef(colorConfig)) {
      // table column contains continuous values
      const colorPalette =
        colorPaletteConfig !== undefined
          ? colorPalettes[colorPaletteConfig]
          : undefined;
      if (colorPalette !== undefined) {
        const tableData = await loadTable(colorConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableValues = await tableData.loadColumn<number>(
          colorConfig.valuesCol,
          { signal },
        );
        signal?.throwIfAborted();
        let vmin, vmax;
        if (colorRangeConfig !== undefined && colorRangeConfig !== "minmax") {
          [vmin, vmax] = colorRangeConfig;
        } else {
          if (colorRangeConfig === undefined) {
            console.warn("Color range not specified, using min-max scaling");
          }
          const values = [];
          for (const id of ids) {
            const tableIndex = tableIndices.get(id);
            if (tableIndex !== undefined) {
              values.push(tableValues[tableIndex]!);
            }
          }
          if (values.length > 0) {
            [vmin, vmax] = [Math.min(...values), Math.max(...values)];
          } else {
            console.warn("No values found, using [0, 1] for color range");
            [vmin, vmax] = [0, 1];
          }
        }
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            let value = tableValues[tableIndex]!;
            if (value < vmin) {
              value = vmin;
            } else if (value > vmax) {
              value = vmax;
            }
            value = (value - vmin) / (vmax - vmin);
            const color =
              colorPalette[Math.floor(value * colorPalette.length)]!;
            data[i] = ColorUtils.packColor(color);
          } else {
            console.warn(`ID ${id} not found in table ${colorConfig.tableId}`);
            data[i] = ColorUtils.packColor(defaultColor);
          }
        }
      } else {
        console.warn("Color palette not configured or found");
        data.fill(ColorUtils.packColor(defaultColor), 0, ids.length);
      }
    } else if (isTableGroupsRef(colorConfig)) {
      // table column contains group names
      let colorMap;
      if (colorMapConfig !== undefined) {
        const configuredColorMap =
          typeof colorMapConfig === "string"
            ? colorMaps.get(colorMapConfig)
            : colorMapConfig;
        if (configuredColorMap !== undefined) {
          let colorMapPalette;
          if (configuredColorMap.palette !== undefined) {
            colorMapPalette = colorPalettes[configuredColorMap.palette];
            if (colorMapPalette === undefined) {
              console.warn(
                `Color map palette ${configuredColorMap.palette} not found`,
              );
            }
          }
          colorMap = {
            values: new Map(Object.entries(configuredColorMap.values)),
            defaultValue: configuredColorMap.defaultValue,
            palette: colorMapPalette,
          };
        }
      }
      if (colorMap !== undefined) {
        // color map found, load group names
        const tableData = await loadTable(colorConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(colorConfig.groupsCol, {
          signal,
        });
        signal?.throwIfAborted();
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const color =
              colorMap.values.get(group) ?? // first, try to get group-specific color
              colorMap.palette?.[
                HashUtils.djb2(group) % colorMap.palette.length
              ] ?? // then, fallback to color map palette
              colorMap.defaultValue ?? // then, fallback to color map default
              defaultColor; // finally, fallback to default color
            data[i] = ColorUtils.packColor(color);
          } else {
            console.warn(`ID ${id} not found in table ${colorConfig.tableId}`);
            data[i] = ColorUtils.packColor(defaultColor);
          }
        }
      } else {
        console.warn("Color map not configured or found");
        data.fill(ColorUtils.packColor(defaultColor), 0, ids.length);
      }
    } else if (colorConfig === "randomFromPalette") {
      // random colors from color palette
      const colorPalette =
        colorPaletteConfig !== undefined
          ? colorPalettes[colorPaletteConfig]
          : undefined;
      if (colorPalette !== undefined) {
        for (let i = 0; i < ids.length; i++) {
          const color =
            colorPalette[Math.floor(Math.random() * colorPalette.length)]!;
          data[i] = ColorUtils.packColor(color);
        }
      } else {
        console.warn("Color palette not configured or found");
        data.fill(ColorUtils.packColor(defaultColor), 0, ids.length);
      }
    } else {
      // uniform color
      data.fill(ColorUtils.packColor(colorConfig), 0, ids.length);
    }
    // combine color with visibility and opacity
    signal?.throwIfAborted();
    for (let i = 0; i < ids.length; i++) {
      const c = MathUtils.safeLeftShift(data[i]!, 8);
      data[i] = c + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
    }
    return data;
  }

  static async loadVisibilityData(
    ids: number[],
    visibilityConfig: boolean | TableValuesRef | TableGroupsRef,
    visibilityMapConfig: string | ValueMap<boolean> | undefined,
    defaultVisibility: boolean,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      paddingMultiple,
    }: { signal?: AbortSignal; paddingMultiple?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesRef(visibilityConfig)) {
      // table column contains visibility values
      const tableData = await loadTable(visibilityConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        visibilityConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          data[i] = tableValues[tableIndex]!;
        } else {
          console.warn(
            `ID ${id} not found in table ${visibilityConfig.tableId}`,
          );
          data[i] = defaultVisibility ? 1 : 0;
        }
      }
    } else if (isTableGroupsRef(visibilityConfig)) {
      // table column contains group names
      let visibilityMap;
      if (visibilityMapConfig !== undefined) {
        const configuredVisibilityMap =
          typeof visibilityMapConfig === "string"
            ? visibilityMaps.get(visibilityMapConfig)
            : visibilityMapConfig;
        if (configuredVisibilityMap !== undefined) {
          visibilityMap = {
            values: new Map(Object.entries(configuredVisibilityMap.values)),
            defaultValue: configuredVisibilityMap.defaultValue,
          };
        } else {
          console.warn(
            `Visibility map ${visibilityMapConfig as string} not found`,
          );
        }
      }
      if (visibilityMap !== undefined) {
        const tableData = await loadTable(visibilityConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          visibilityConfig.groupsCol,
          { signal },
        );
        signal?.throwIfAborted();
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const visibility =
              visibilityMap.values.get(group) ?? // first, try to get group-specific visibility
              visibilityMap.defaultValue ?? // then, fallback to visibility map default
              defaultVisibility; // finally, fallback to default visibility
            data[i] = visibility ? 1 : 0;
          } else {
            console.warn(
              `ID ${id} not found in table ${visibilityConfig.tableId}`,
            );
            data[i] = defaultVisibility ? 1 : 0;
          }
        }
      } else {
        console.warn("Visibility map not configured or found");
        data.fill(defaultVisibility ? 1 : 0, 0, ids.length);
      }
    } else {
      // uniform visibility
      data.fill(visibilityConfig ? 1 : 0, 0, ids.length);
    }
    return data;
  }

  static async loadOpacityData(
    ids: number[],
    opacityConfig: number | TableValuesRef | TableGroupsRef,
    opacityMapConfig: string | ValueMap<number> | undefined,
    defaultOpacity: number,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    {
      signal,
      paddingMultiple,
      opacityFactor = 1,
    }: {
      signal?: AbortSignal;
      paddingMultiple?: number;
      opacityFactor?: number;
    } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const data = new Uint8Array(dataLength);
    if (isTableValuesRef(opacityConfig)) {
      // table column contains opacity values
      const tableData = await loadTable(opacityConfig.tableId, {
        signal,
      });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        opacityConfig.valuesCol,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          data[i] = Math.round(opacityFactor * tableValues[tableIndex]! * 255);
        } else {
          console.warn(`ID ${id} not found in table ${opacityConfig.tableId}`);
          data[i] = Math.round(opacityFactor * defaultOpacity * 255);
        }
      }
    } else if (isTableGroupsRef(opacityConfig)) {
      // table column contains group names
      let opacityMap = undefined;
      if (opacityMapConfig !== undefined) {
        const configuredOpacityMap =
          typeof opacityMapConfig === "string"
            ? opacityMaps.get(opacityMapConfig)
            : opacityMapConfig;
        if (configuredOpacityMap !== undefined) {
          opacityMap = {
            values: new Map(Object.entries(configuredOpacityMap.values)),
            defaultValue: configuredOpacityMap.defaultValue,
          };
        }
      }
      if (opacityMap !== undefined) {
        const tableData = await loadTable(opacityConfig.tableId, {
          signal,
        });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          opacityConfig.groupsCol,
          { signal },
        );
        signal?.throwIfAborted();
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const opacity =
              opacityMap.values.get(group) ?? // first, try to get group-specific opacity
              opacityMap.defaultValue ?? // then, fallback to opacity map default
              defaultOpacity; // finally, fallback to default opacity
            data[i] = Math.round(opacityFactor * opacity * 255);
          } else {
            console.warn(
              `ID ${id} not found in table ${opacityConfig.tableId}`,
            );
            data[i] = Math.round(opacityFactor * defaultOpacity * 255);
          }
        }
      } else {
        console.warn("Opacity map not configured or found");
        data.fill(
          Math.round(opacityFactor * defaultOpacity * 255),
          0,
          ids.length,
        );
      }
    } else {
      // uniform opacity
      data.fill(Math.round(opacityFactor * opacityConfig * 255), 0, ids.length);
    }
    return data;
  }
}
