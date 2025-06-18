import { IPointsDataSourceModel } from "../models/points";
import { IData, IDataLoader } from "./base";
import { IntArray, TypedArray, UintArray } from "./types";

export interface IPointsData extends IData {
  points: IntArray | UintArray;
  dimensions: string[];
  getCoordinates(dimension: string): TypedArray;
}

export interface IPointsDataLoader extends IDataLoader {
  loadPoints: (
    dataSource: IPointsDataSourceModel<string>,
  ) => Promise<IPointsData>;
}
