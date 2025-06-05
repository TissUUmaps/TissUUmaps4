import { TableSourceModelBase } from "../models/base";
import { PointsSourceModel } from "../models/points";
import { ShapesSourceModel } from "../models/shapes";
import {
  GeoJSONGeometry,
  PointsSourceBase,
  ShapesSourceBase,
  TableSourceBase,
  TypedArray,
} from "./base";

abstract class ParquetSource<TConfig extends TableSourceModelBase<string>>
  implements TableSourceBase<TConfig>
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

export const PARQUET_POINTS_SOURCE = "parquet-points";

export class ParquetPointsSource
  extends ParquetSource<ParquetPointsSourceModel>
  implements PointsSourceBase<ParquetPointsSourceModel>
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
export interface ParquetPointsSourceModel
  extends PointsSourceModel<typeof PARQUET_POINTS_SOURCE> {}

export const PARQUET_SHAPES_SOURCE = "parquet-shapes";

export class ParquetShapesSource
  extends ParquetSource<ParquetShapesSourceModel>
  implements ShapesSourceBase<ParquetShapesSourceModel>
{
  loadShapeIDs(): Promise<TypedArray> {
    throw new Error("Method not implemented."); // TODO
  }

  loadShapeGeometries(): Promise<GeoJSONGeometry[]> {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ParquetShapesSourceModel
  extends ShapesSourceModel<typeof PARQUET_SHAPES_SOURCE> {}
