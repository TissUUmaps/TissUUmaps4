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
    if (isTableValuesColumn(value)) {
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
    if (isTableGroupsColumn(value)) {
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

  protected static _createTransform(
    layer: ILayerModel,
    layerConfig: ILayerConfigModel,
  ): mat3 {
    const transform = mat3.create();
    if (layerConfig.scale) {
      mat3.scale(transform, transform, [layerConfig.scale, layerConfig.scale]);
    }
    if (layerConfig.flip) {
      mat3.scale(transform, transform, [-1, 1]);
    }
    if (layerConfig.rotation) {
      mat3.rotate(transform, transform, (layerConfig.rotation * Math.PI) / 180);
    }
    if (layerConfig.translation) {
      mat3.translate(transform, transform, [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
    }
    if (layer.scale) {
      mat3.scale(transform, transform, [layer.scale, layer.scale]);
    }
    if (layer.translation) {
      mat3.translate(transform, transform, [
        layer.translation.x,
        layer.translation.y,
      ]);
    }
    return transform;
  }

  protected _createViewTransform(): Float32Array {
    // TODO view transform
    throw new Error("View transform creation not implemented");
  }
}
