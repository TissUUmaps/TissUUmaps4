import { colorPalettes, markerPalette } from "../palettes";
import { type TableData } from "../storage/table";
import { type Color } from "../types/color";
import {
  type ColorConfig,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
  isValueConfig,
} from "../types/config";
import { Marker } from "../types/marker";
import { type ValueMap } from "../types/valueMap";
import { ColorUtils } from "./ColorUtils";
import { HashUtils } from "./HashUtils";
import { MathUtils } from "./MathUtils";

export type LoadTableFunction = (
  tableId: string,
  options: { signal?: AbortSignal },
) => Promise<TableData>;

export class LoadUtils {
  static async loadMarkerData(
    ids: number[],
    markerConfig: MarkerConfig,
    markerMaps: Map<string, ValueMap<Marker>>,
    defaultMarker: Marker,
    loadTable: LoadTableFunction,
    { signal, padding }: { signal?: AbortSignal; padding?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint8Array(dataLength);
    if (isValueConfig(markerConfig)) {
      const marker = markerConfig.value;
      const markerIndex = marker as number;
      data.fill(markerIndex, 0, ids.length);
    } else if (isFromConfig(markerConfig)) {
      const tableData = await loadTable(markerConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        markerConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      let e = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const markerIndex = tableValues[tableIndex]!;
          data[i] = markerIndex;
        } else {
          const markerIndex = defaultMarker as number;
          data[i] = markerIndex;
          e++;
        }
      }
      if (e > 0) {
        console.warn(`${e} IDs missing in table ${markerConfig.from.table}`);
      }
    } else if (isGroupByConfig(markerConfig)) {
      let markerMap;
      if (typeof markerConfig.groupBy.map === "string") {
        markerMap = markerMaps.get(markerConfig.groupBy.map);
        if (markerMap === undefined) {
          console.warn(`Marker map ${markerConfig.groupBy.map} not found`);
        }
      } else {
        markerMap = markerConfig.groupBy.map;
      }
      if (markerMap !== undefined) {
        markerMap = {
          values: new Map(Object.entries(markerMap.values)),
          defaultValue: markerMap.defaultValue,
        };
      }
      const tableData = await loadTable(markerConfig.groupBy.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableGroups = await tableData.loadColumn(
        markerConfig.groupBy.column,
        { signal },
      );
      signal?.throwIfAborted();
      let e = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const group = JSON.stringify(tableGroups[tableIndex]!);
          if (markerMap !== undefined) {
            const marker =
              markerMap.values.get(group) ?? // first, try to get group-specific marker
              markerMap.defaultValue ?? // then, fallback to marker map default
              defaultMarker; // finally, fallback to default marker
            const markerIndex = marker as number;
            data[i] = markerIndex;
          } else {
            const markerIndex = HashUtils.djb2(group) % markerPalette.length;
            data[i] = markerIndex;
          }
        } else {
          const markerIndex = defaultMarker as number;
          data[i] = markerIndex;
          e++;
        }
      }
      if (e > 0) {
        console.warn(`${e} IDs missing in table ${markerConfig.groupBy.table}`);
      }
    } else {
      const markerIndex = defaultMarker as number;
      data.fill(markerIndex, 0, ids.length);
    }
    return data;
  }

  static async loadSizeData(
    ids: number[],
    sizeConfig: SizeConfig,
    sizeMaps: Map<string, ValueMap<number>>,
    defaultSize: number,
    loadTable: LoadTableFunction,
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
    if (isValueConfig(sizeConfig)) {
      const scaledSize = sizeConfig.value * sizeFactor;
      data.fill(scaledSize, 0, ids.length);
    } else if (isFromConfig(sizeConfig)) {
      const tableData = await loadTable(sizeConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        sizeConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      let e = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const size = tableValues[tableIndex]!;
          const scaledSize = size * sizeFactor;
          data[i] = scaledSize;
        } else {
          const scaledSize = defaultSize * sizeFactor;
          data[i] = scaledSize;
          e++;
        }
      }
      if (e > 0) {
        console.warn(`${e} IDs missing in table ${sizeConfig.from.table}`);
      }
    } else if (isGroupByConfig(sizeConfig)) {
      let sizeMap;
      if (typeof sizeConfig.groupBy.map === "string") {
        sizeMap = sizeMaps.get(sizeConfig.groupBy.map);
        if (sizeMap === undefined) {
          console.warn(`Size map ${sizeConfig.groupBy.map} not found`);
        }
      } else {
        sizeMap = sizeConfig.groupBy.map;
      }
      if (sizeMap !== undefined) {
        sizeMap = {
          values: new Map(Object.entries(sizeMap.values)),
          defaultValue: sizeMap.defaultValue,
        };
        const tableData = await loadTable(sizeConfig.groupBy.table, { signal });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableGroups = await tableData.loadColumn(
          sizeConfig.groupBy.column,
          { signal },
        );
        signal?.throwIfAborted();
        let e = 0;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const size =
              sizeMap.values.get(group) ?? // first, try to get group-specific size
              sizeMap.defaultValue ?? // then, fallback to size map default
              defaultSize; // finally, fallback to default size
            const scaledSize = size * sizeFactor;
            data[i] = scaledSize;
          } else {
            const scaledSize = defaultSize * sizeFactor;
            data[i] = scaledSize;
            e++;
          }
        }
        if (e > 0) {
          console.warn(`${e} IDs missing in table ${sizeConfig.groupBy.table}`);
        }
      } else {
        const scaledSize = defaultSize * sizeFactor;
        data.fill(scaledSize, 0, ids.length);
      }
    } else {
      const scaledSize = defaultSize * sizeFactor;
      data.fill(scaledSize, 0, ids.length);
    }
    return data;
  }

  static async loadColorData(
    ids: number[],
    colorConfig: ColorConfig,
    colorMaps: Map<string, ValueMap<Color>>,
    defaultColor: Color,
    loadTable: LoadTableFunction,
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
    if (isValueConfig(colorConfig)) {
      const packedColor = ColorUtils.packColor(colorConfig.value);
      data.fill(packedColor, 0, ids.length);
    } else if (isFromConfig(colorConfig)) {
      const colorPalette = colorPalettes[colorConfig.from.palette];
      if (colorPalette !== undefined) {
        const tableData = await loadTable(colorConfig.from.table, { signal });
        signal?.throwIfAborted();
        const tableIds = tableData.getIndex();
        const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
        const tableValues = await tableData.loadColumn<number>(
          colorConfig.from.column,
          { signal },
        );
        signal?.throwIfAborted();
        let vmin, vmax;
        if (colorConfig.from.range !== undefined) {
          [vmin, vmax] = colorConfig.from.range;
        } else {
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
            console.warn("No values found, using [0, 1] color range instead");
            [vmin, vmax] = [0, 1];
          }
        }
        if (vmax <= vmin) {
          console.warn("Invalid color range, using [0, 1] instead");
          [vmin, vmax] = [0, 1];
        }
        let e = 0;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            let v = tableValues[tableIndex]!;
            if (v < vmin) {
              v = vmin;
            } else if (v > vmax) {
              v = vmax;
            }
            v = (v - vmin) / (vmax - vmin);
            const colorIndex = Math.floor(v * colorPalette.length);
            const color = colorPalette[colorIndex]!;
            const packedColor = ColorUtils.packColor(color);
            data[i] = packedColor;
          } else {
            const packedColor = ColorUtils.packColor(defaultColor);
            data[i] = packedColor;
            e++;
          }
        }
        if (e > 0) {
          console.warn(`${e} IDs missing in table ${colorConfig.from.table}`);
        }
      } else {
        console.warn(`Color palette ${colorConfig.from.palette} not found`);
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else if (isGroupByConfig(colorConfig)) {
      let colorMap;
      if (typeof colorConfig.groupBy.map === "string") {
        colorMap = colorMaps.get(colorConfig.groupBy.map);
        if (colorMap === undefined) {
          console.warn(`Color map ${colorConfig.groupBy.map} not found`);
        }
      } else {
        colorMap = colorConfig.groupBy.map;
      }
      if (colorMap !== undefined) {
        colorMap = {
          values: new Map(Object.entries(colorMap.values)),
          defaultValue: colorMap.defaultValue,
        };
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
        let e = 0;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const color =
              colorMap.values.get(group) ?? // first, try to get group-specific color
              colorMap.defaultValue ?? // then, fallback to color map default
              defaultColor; // finally, fallback to default color
            const packedColor = ColorUtils.packColor(color);
            data[i] = packedColor;
          } else {
            const packedColor = ColorUtils.packColor(defaultColor);
            data[i] = packedColor;
            e++;
          }
        }
        if (e > 0) {
          console.warn(
            `${e} IDs missing in table ${colorConfig.groupBy.table}`,
          );
        }
      } else {
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else if (isRandomConfig(colorConfig)) {
      const colorPalette = colorPalettes[colorConfig.random.palette];
      if (colorPalette !== undefined) {
        for (let i = 0; i < ids.length; i++) {
          const colorIndex = Math.floor(Math.random() * colorPalette.length);
          const color = colorPalette[colorIndex]!;
          const packedColor = ColorUtils.packColor(color);
          data[i] = packedColor;
        }
      } else {
        console.warn(`Color palette ${colorConfig.random.palette} not found`);
        const packedColor = ColorUtils.packColor(defaultColor);
        data.fill(packedColor, 0, ids.length);
      }
    } else {
      const packedColor = ColorUtils.packColor(defaultColor);
      data.fill(packedColor, 0, ids.length);
    }
    for (let i = 0; i < ids.length; i++) {
      const c = MathUtils.safeLeftShift(data[i]!, 8);
      data[i] = c + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
    }
    return data;
  }

  static async loadVisibilityData(
    ids: number[],
    visibilityConfig: VisibilityConfig,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    defaultVisibility: boolean,
    loadTable: LoadTableFunction,
    { signal, padding }: { signal?: AbortSignal; padding?: number } = {},
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    let dataLength = ids.length;
    if (padding && dataLength % padding !== 0) {
      dataLength += padding - (dataLength % padding);
    }
    const data = new Uint8Array(dataLength);
    if (isValueConfig(visibilityConfig)) {
      const numericVisibility = visibilityConfig.value ? 1 : 0;
      data.fill(numericVisibility, 0, ids.length);
    } else if (isFromConfig(visibilityConfig)) {
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
      let e = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const numericVisibility = tableValues[tableIndex]!;
          data[i] = numericVisibility;
        } else {
          const numericVisibility = defaultVisibility ? 1 : 0;
          data[i] = numericVisibility;
          e++;
        }
      }
      if (e > 0) {
        console.warn(
          `${e} IDs missing in table ${visibilityConfig.from.table}`,
        );
      }
    } else if (isGroupByConfig(visibilityConfig)) {
      let visibilityMap;
      if (typeof visibilityConfig.groupBy.map === "string") {
        visibilityMap = visibilityMaps.get(visibilityConfig.groupBy.map);
        if (visibilityMap === undefined) {
          console.warn(
            `Visibility map ${visibilityConfig.groupBy.map} not found`,
          );
        }
      } else {
        visibilityMap = visibilityConfig.groupBy.map;
      }
      if (visibilityMap !== undefined) {
        visibilityMap = {
          values: new Map(Object.entries(visibilityMap.values)),
          defaultValue: visibilityMap.defaultValue,
        };
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
        let e = 0;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const visibility =
              visibilityMap.values.get(group) ?? // first, try to get group-specific visibility
              visibilityMap.defaultValue ?? // then, fallback to visibility map default
              defaultVisibility; // finally, fallback to default visibility
            const numericVisibility = visibility ? 1 : 0;
            data[i] = numericVisibility;
          } else {
            const numericVisibility = defaultVisibility ? 1 : 0;
            data[i] = numericVisibility;
            e++;
          }
        }
        if (e > 0) {
          console.warn(
            `${e} IDs missing in table ${visibilityConfig.groupBy.table}`,
          );
        }
      } else {
        const numericVisibility = defaultVisibility ? 1 : 0;
        data.fill(numericVisibility, 0, ids.length);
      }
    } else {
      const numericVisibility = defaultVisibility ? 1 : 0;
      data.fill(numericVisibility, 0, ids.length);
    }
    return data;
  }

  static async loadOpacityData(
    ids: number[],
    opacityConfig: OpacityConfig,
    opacityMaps: Map<string, ValueMap<number>>,
    defaultOpacity: number,
    loadTable: LoadTableFunction,
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
    if (isValueConfig(opacityConfig)) {
      const scaledOpacity = opacityFactor * opacityConfig.value;
      const scaledOpacityInt = Math.round(scaledOpacity * 255);
      data.fill(scaledOpacityInt, 0, ids.length);
    } else if (isFromConfig(opacityConfig)) {
      const tableData = await loadTable(opacityConfig.from.table, { signal });
      signal?.throwIfAborted();
      const tableIds = tableData.getIndex();
      const tableIndices = new Map(tableIds.map((id, index) => [id, index]));
      const tableValues = await tableData.loadColumn<number>(
        opacityConfig.from.column,
        { signal },
      );
      signal?.throwIfAborted();
      let e = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const tableIndex = tableIndices.get(id);
        if (tableIndex !== undefined) {
          const scaledOpacity = opacityFactor * tableValues[tableIndex]!;
          const scaledOpacityInt = Math.round(scaledOpacity * 255);
          data[i] = scaledOpacityInt;
        } else {
          const scaledOpacity = opacityFactor * defaultOpacity;
          const scaledOpacityInt = Math.round(scaledOpacity * 255);
          data[i] = scaledOpacityInt;
          e++;
        }
      }
      if (e > 0) {
        console.warn(`${e} IDs missing in table ${opacityConfig.from.table}`);
      }
    } else if (isGroupByConfig(opacityConfig)) {
      let opacityMap;
      if (typeof opacityConfig.groupBy.map === "string") {
        opacityMap = opacityMaps.get(opacityConfig.groupBy.map);
        if (opacityMap === undefined) {
          console.warn(`Opacity map ${opacityConfig.groupBy.map} not found`);
        }
      } else {
        opacityMap = opacityConfig.groupBy.map;
      }
      if (opacityMap !== undefined) {
        opacityMap = {
          values: new Map(Object.entries(opacityMap.values)),
          defaultValue: opacityMap.defaultValue,
        };
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
        let e = 0;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          const tableIndex = tableIndices.get(id);
          if (tableIndex !== undefined) {
            const group = JSON.stringify(tableGroups[tableIndex]!);
            const opacity =
              opacityMap.values.get(group) ?? // first, try to get group-specific opacity
              opacityMap.defaultValue ?? // then, fallback to opacity map default
              defaultOpacity; // finally, fallback to default opacity
            const scaledOpacity = opacityFactor * opacity;
            const scaledOpacityInt = Math.round(scaledOpacity * 255);
            data[i] = scaledOpacityInt;
          } else {
            const scaledOpacity = opacityFactor * defaultOpacity;
            const scaledOpacityInt = Math.round(scaledOpacity * 255);
            data[i] = scaledOpacityInt;
            e++;
          }
        }
        if (e > 0) {
          console.warn(
            `${e} IDs missing in table ${opacityConfig.groupBy.table}`,
          );
        }
      } else {
        const scaledOpacity = opacityFactor * defaultOpacity;
        const scaledOpacityInt = Math.round(scaledOpacity * 255);
        data.fill(scaledOpacityInt, 0, ids.length);
      }
    } else {
      const scaledOpacity = opacityFactor * defaultOpacity;
      const scaledOpacityInt = Math.round(scaledOpacity * 255);
      data.fill(scaledOpacityInt, 0, ids.length);
    }
    return data;
  }
}
