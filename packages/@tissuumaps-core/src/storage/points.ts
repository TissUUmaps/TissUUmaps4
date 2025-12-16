import { type Data, type DataLoader } from "./base";

export interface PointsDataLoader<
  TPointsData extends PointsData,
> extends DataLoader {
  loadPoints(options: { signal?: AbortSignal }): Promise<TPointsData>;
}

export interface PointsData extends Data {
  getLength(): number;
  getDimensions(): string[];
  loadCoordinates(
    dimension: string,
    options: { signal?: AbortSignal },
  ): Promise<Float32Array>;
}
