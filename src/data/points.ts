import { IData, IDataLoader } from "./base";

export interface IPointsData extends IData {
  getIds(): number[];
  getLength(): number;
  getDimensions(): string[];
  loadCoordinates(dimension: string): Promise<Float32Array>;
}

export interface IPointsDataLoader<TPointsData extends IPointsData>
  extends IDataLoader {
  loadPoints(): Promise<TPointsData>;
}
