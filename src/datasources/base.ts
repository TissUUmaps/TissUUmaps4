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

export interface DataSource {
  getValuesColumns(): string[];
  getGroupsColumns(): string[];
  loadColumn(col: string): Promise<TypedArray>;
}

export interface ImageDataSource extends DataSource {
  getImage(): TileSourceSpec;
}

export interface LabelsDataSource extends DataSource {
  getLabels(): TileSourceSpec;
}

export interface PointsDataSource extends DataSource {
  loadPoints(
    xValuesCol: string,
    yValuesCol: string,
  ): Promise<[TypedArray, TypedArray]>;
}

export interface ShapesDataSource extends DataSource {
  loadShapes(): Promise<GeoJSONGeometry[]>;
}
