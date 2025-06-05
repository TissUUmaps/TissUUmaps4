import { TableDataSourceModelBase } from "../models/base";
import { PointsDataSourceModel } from "../models/points";
import { ShapesDataSourceModel } from "../models/shapes";
import {
  GeoJSONGeometry,
  PointsDataSourceBase,
  ShapesDataSourceBase,
  TableDataSourceBase,
  TypedArray,
} from "./base";

abstract class ParquetDataSourceBase<
  TConfig extends TableDataSourceModelBase<string>,
> implements TableDataSourceBase<TConfig>
{
  private config: TConfig;

  constructor(config: TConfig) {
    this.config = config;
  }

  getConfig(): TConfig {
    return this.config;
  }

  getColumns(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _values: boolean = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _groups: boolean = false,
  ): string[] {
    throw new Error("Method not implemented."); // TODO
  }

  loadColumn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _col: string,
  ): Promise<TypedArray> {
    throw new Error("Method not implemented."); // TODO
  }
}

export const PARQUET_POINTS_DATA_SOURCE = "parquet";

export class ParquetPointsDataSource
  extends ParquetDataSourceBase<ParquetPointsDataSourceModel>
  implements PointsDataSourceBase<ParquetPointsDataSourceModel>
{
  loadPointIDs(): Promise<TypedArray> {
    throw new Error("Method not implemented."); // TODO
  }

  loadPointPositions(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _xValuesCol?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _yValuesCol?: string,
  ): Promise<[TypedArray, TypedArray]> {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParquetPointsDataSourceModel
  extends PointsDataSourceModel<typeof PARQUET_POINTS_DATA_SOURCE> {}

export const PARQUET_SHAPES_DATA_SOURCE = "parquet";

export class ParquetShapesDataSource
  extends ParquetDataSourceBase<ParquetShapesDataSourceModel>
  implements ShapesDataSourceBase<ParquetShapesDataSourceModel>
{
  loadShapeIDs(): Promise<TypedArray> {
    throw new Error("Method not implemented."); // TODO
  }

  loadShapeGeometries(): Promise<GeoJSONGeometry[]> {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParquetShapesDataSourceModel
  extends ShapesDataSourceModel<typeof PARQUET_SHAPES_DATA_SOURCE> {}
