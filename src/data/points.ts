import { IData, IDataLoader } from "./base";

export interface IPointsData extends IData {
  getIds(): number[];
  getDimensions(): string[];
  loadPositions(
    xDimension: string,
    yDimension: string,
  ): Promise<[Float32Array, Float32Array]>;
}

export interface IPointsDataLoader<TPointsData extends IPointsData>
  extends IDataLoader {
  loadPoints(): Promise<TPointsData>;
}
