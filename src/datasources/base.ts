import {
  ObjectDataSourceModelBase,
  PixelsDataSourceModelBase,
  TableDataSourceModelBase,
} from "../models/base";
import { ImageDataSourceModel } from "../models/image";
import { LabelsDataSourceModel } from "../models/labels";
import { PointsDataSourceModel } from "../models/points";
import { ShapesDataSourceModel } from "../models/shapes";

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type TileSourceSpec = string | object;

export type GeoJSONGeometry = object;

export interface DataSourceBase<
  TConfig extends ObjectDataSourceModelBase<string>,
> {
  getConfig(): TConfig;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsDataSourceBase<
  TConfig extends PixelsDataSourceModelBase<string>,
> extends DataSourceBase<TConfig> {}

export interface TableDataSourceBase<
  TConfig extends TableDataSourceModelBase<string>,
> extends DataSourceBase<TConfig> {
  getColumns(values: boolean, groups: boolean): string[];
  loadColumn(col: string): Promise<TypedArray>;
}

export interface ImageDataSourceBase<
  TConfig extends ImageDataSourceModel<string>,
> extends PixelsDataSourceBase<TConfig> {
  getImage(): TileSourceSpec;
}

export interface LabelsDataSourceBase<
  TConfig extends LabelsDataSourceModel<string>,
> extends PixelsDataSourceBase<TConfig>,
    TableDataSourceBase<TConfig> {
  loadLabelIDs(): Promise<TypedArray>;
  getLabelImage(): TileSourceSpec;
}

export interface PointsDataSourceBase<
  TConfig extends PointsDataSourceModel<string>,
> extends TableDataSourceBase<TConfig> {
  loadPointIDs(): Promise<TypedArray>;
  loadPointPositions(
    xValuesCol?: string,
    yValuesCol?: string,
  ): Promise<[TypedArray, TypedArray]>;
}

export interface ShapesDataSourceBase<
  TConfig extends ShapesDataSourceModel<string>,
> extends TableDataSourceBase<TConfig> {
  loadShapeIDs(): Promise<TypedArray>;
  loadShapeGeometries(): Promise<GeoJSONGeometry[]>;
}
