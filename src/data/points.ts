import { IPointsDataSourceModel } from "../models/points";
import { IData, IDataLoader } from "./base";
import { IntArray, TypedArray, UintArray } from "./types";

export interface IPointsData extends IData {
  readonly dimensions: string[];
  readonly pointIds: IntArray | UintArray;
  getPointCoordinates(dimension: string): TypedArray;
}

export interface IPointsDataLoader extends IDataLoader {
  loadPoints: (
    dataSource: IPointsDataSourceModel<string>,
  ) => Promise<IPointsData>;
}
