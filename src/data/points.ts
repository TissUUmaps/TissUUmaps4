import { IData, IDataLoader } from "./base";
import { TypedArray } from "./types";

export interface IPointsData extends IData {
  getIds(): number[];
  getDimensions(): string[];
  loadCoordinates(dimension: string): Promise<TypedArray>;
}

export interface IPointsDataLoader<TPointsData extends IPointsData>
  extends IDataLoader {
  loadPoints(): Promise<TPointsData>;
}
