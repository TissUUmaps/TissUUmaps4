import { IPointsDataSourceModel } from "../models/points";
import { IData, IDataLoader } from "./base";
import { IntArray, TypedArray, UintArray } from "./types";

export interface IPointsData extends IData {
  readonly dimensions: string[];
  readonly pointIds: IntArray | UintArray;
  getPointCoordinates(dimension: string): TypedArray;
}

export interface IPointsDataLoader<
  TPointsDataSourceModel extends IPointsDataSourceModel<string>,
> extends IDataLoader {
  loadPoints: (dataSource: TPointsDataSourceModel) => Promise<IPointsData>;
}
