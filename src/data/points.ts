import { IPointsDataSourceModel } from "../models/points";
import { IData, IDataLoader } from "./base";
import { TypedArray, UintArray } from "./types";

export interface IPointsData extends IData {
  getIds(): UintArray;
  getDimensions(): string[];
  loadCoordinates(dimension: string): Promise<TypedArray>;
}

export interface IPointsDataLoader<
  TPointsDataSourceModel extends IPointsDataSourceModel<string>,
  TPointsData extends IPointsData,
> extends IDataLoader<TPointsDataSourceModel> {
  loadPoints: (abortSignal?: AbortSignal) => Promise<TPointsData>;
}
