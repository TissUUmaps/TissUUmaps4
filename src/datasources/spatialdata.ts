import { ImageDataSourceModel } from "../models/image";
import { LabelsDataSourceModel } from "../models/labels";
import { PointsDataSourceModel } from "../models/points";
import { ShapesDataSourceModel } from "../models/shapes";
import {
  GeoJSONGeometry,
  ImageDataSource,
  LabelsDataSource,
  PointsDataSource,
  ShapesDataSource,
  TileSourceSpec,
  TypedArray,
} from "./base";

export const SPATIALDATA_DATA_SOURCE = "spatialdata";

export class SpatialDataDataSource
  implements
    ImageDataSource,
    LabelsDataSource,
    PointsDataSource,
    ShapesDataSource
{
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: SpatialDataDataSourceOptions,
  ) {}

  getValuesColumns(): string[] {
    // TODO
    throw new Error("Method not implemented.");
  }

  getGroupsColumns(): string[] {
    // TODO
    throw new Error("Method not implemented.");
  }

  loadColumn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _col: string,
  ): Promise<TypedArray> {
    // TODO
    throw new Error("Method not implemented.");
  }

  getImage(): TileSourceSpec {
    // TODO
    throw new Error("Method not implemented.");
  }

  getLabels(): TileSourceSpec {
    // TODO
    throw new Error("Method not implemented.");
  }

  async loadPoints(
    xValuesCol: string,
    yValuesCol: string,
  ): Promise<[TypedArray, TypedArray]> {
    const px = this.loadColumn(xValuesCol);
    const py = this.loadColumn(yValuesCol);
    const [xs, ys] = await Promise.all([px, py]);
    return [xs, ys] as [TypedArray, TypedArray];
  }

  loadShapes(): Promise<GeoJSONGeometry[]> {
    // TODO
    throw new Error("Method not implemented.");
  }
}

export interface SpatialDataDataSourceOptions
  extends ImageDataSourceModel<typeof SPATIALDATA_DATA_SOURCE>,
    LabelsDataSourceModel<typeof SPATIALDATA_DATA_SOURCE>,
    PointsDataSourceModel<typeof SPATIALDATA_DATA_SOURCE>,
    ShapesDataSourceModel<typeof SPATIALDATA_DATA_SOURCE> {}
