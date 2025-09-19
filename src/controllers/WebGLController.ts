import { mat3 } from "gl-matrix";

import { ITableData } from "../data/table";
import { TypedArray } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { ILayerModel } from "../models/layer";
import {
  TableGroupsColumn,
  TableValuesColumn,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../models/types";
import ArrayUtils from "../utils/ArrayUtils";
import HashUtils from "../utils/HashUtils";

export default class WebGLController {
  protected readonly _gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  protected async _prepareBufferData<TValue, TTableValue = TValue>(
    arr: TypedArray,
    value: TValue | TableValuesColumn | TableGroupsColumn | undefined,
    defaultValues: TValue[],
    tableGroupValues: Map<string, TValue> | undefined,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
    toArrayValue: (value: TValue) => number | number[] = (value) =>
      value as unknown as number | number[],
    parseTableValue: (tableValue: TTableValue) => TValue = (tableValue) =>
      tableValue as unknown as TValue,
  ): Promise<boolean> {
    if (value !== undefined && isTableValuesColumn(value)) {
      const tableData = await loadTableByID(value.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableValues = await tableData.loadColumn<TTableValue>(
        value.valuesCol,
      );
      if (checkAbort()) {
        return false;
      }
      for (let i = 0; i < tableValues.length; i++) {
        const value = parseTableValue(tableValues[i]!);
        const arrayValue = toArrayValue(value);
        if (Array.isArray(arrayValue)) {
          arr.set(arrayValue, i * arrayValue.length);
        } else {
          arr[i] = arrayValue;
        }
      }
      return true;
    }
    if (value !== undefined && isTableGroupsColumn(value)) {
      const tableData = await loadTableByID(value.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableGroups = await tableData.loadColumn(value.groupsCol);
      if (checkAbort()) {
        return false;
      }
      for (let i = 0; i < tableGroups.length; i++) {
        const tableGroup = JSON.stringify(tableGroups[i]!);
        const value =
          tableGroupValues !== undefined
            ? (tableGroupValues.get(tableGroup) ?? defaultValues[0]!)
            : defaultValues[HashUtils.djb2(tableGroup) % defaultValues.length]!;
        const arrayValue = toArrayValue(value);
        if (Array.isArray(arrayValue)) {
          arr.set(arrayValue, i * arrayValue.length);
        } else {
          arr[i] = arrayValue;
        }
      }
      return true;
    }
    const arrayValue = toArrayValue(value ?? defaultValues[0]!);
    if (Array.isArray(arrayValue)) {
      ArrayUtils.fillSeq(arr, arrayValue);
    } else {
      arr.fill(arrayValue);
    }
    return true;
  }

  protected static createDataToLayerTransform(
    layerConfig: ILayerConfigModel,
  ): mat3 {
    const tf = mat3.create();
    if (layerConfig.scale) {
      mat3.scale(tf, tf, [layerConfig.scale, layerConfig.scale]);
    }
    if (layerConfig.flip) {
      mat3.scale(tf, tf, [-1, 1]);
    }
    if (layerConfig.rotation) {
      mat3.rotate(tf, tf, (layerConfig.rotation * Math.PI) / 180);
    }
    if (layerConfig.translation) {
      mat3.translate(tf, tf, [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
    }
    return tf;
  }

  protected static createLayerToWorldTransform(layer: ILayerModel): mat3 {
    const tf = mat3.create();
    if (layer.scale) {
      mat3.scale(tf, tf, [layer.scale, layer.scale]);
    }
    if (layer.translation) {
      mat3.translate(tf, tf, [layer.translation.x, layer.translation.y]);
    }
    return tf;
  }

  protected static createWorldToViewportTransform(viewport: Viewport): mat3 {
    const tf = mat3.create();
    mat3.translate(tf, tf, [-viewport.x, -viewport.y]);
    mat3.scale(tf, tf, [1.0 / viewport.width, 1.0 / viewport.height]);
    return tf;
  }
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
