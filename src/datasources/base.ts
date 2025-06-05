import {
  DataSourceModelBase,
  PixelsSourceModelBase,
  TableSourceModelBase,
} from "../models/base";
import { ImageSourceModel } from "../models/image";
import { LabelsSourceModel } from "../models/labels";
import { PointsSourceModel } from "../models/points";
import { ShapesSourceModel } from "../models/shapes";

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

export interface DataSourceBase<TConfig extends DataSourceModelBase<string>> {
  getConfig(): TConfig;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsSourceBase<TConfig extends PixelsSourceModelBase<string>>
  extends DataSourceBase<TConfig> {}

export interface TableSourceBase<TConfig extends TableSourceModelBase<string>>
  extends DataSourceBase<TConfig> {
  getColumns(values: boolean, groups: boolean): string[];
  loadColumn(col: string): Promise<TypedArray>;
}

export interface ImageSourceBase<TConfig extends ImageSourceModel<string>>
  extends PixelsSourceBase<TConfig> {
  getImage(): TileSourceSpec;
}

export interface LabelsSourceBase<TConfig extends LabelsSourceModel<string>>
  extends PixelsSourceBase<TConfig>,
    TableSourceBase<TConfig> {
  loadLabelIDs(): Promise<TypedArray>;
  getLabelImage(): TileSourceSpec;
}

export interface PointsSourceBase<TConfig extends PointsSourceModel<string>>
  extends TableSourceBase<TConfig> {
  loadPointIDs(): Promise<TypedArray>;
  loadPointPositions(
    xValuesCol?: string,
    yValuesCol?: string,
  ): Promise<[TypedArray, TypedArray]>;
}

export interface ShapesSourceBase<TConfig extends ShapesSourceModel<string>>
  extends TableSourceBase<TConfig> {
  loadShapeIDs(): Promise<TypedArray>;
  loadShapeGeometries(): Promise<GeoJSONGeometry[]>;
}
