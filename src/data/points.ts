import { IData, IDataLoader } from "./base";

export interface IPointsData extends IData {
  getLength(): number;
  getDimensions(): string[];
  loadCoordinates(
    dimension: string,
    signal?: AbortSignal,
  ): Promise<Float32Array>;
}

export interface IPointsDataLoader<TPointsData extends IPointsData>
  extends IDataLoader {
  loadPoints(signal?: AbortSignal): Promise<TPointsData>;
}
