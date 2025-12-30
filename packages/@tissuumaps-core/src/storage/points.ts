import { type DataLoader, type ItemsData } from "./base";

export interface PointsDataLoader<
  TPointsData extends PointsData,
> extends DataLoader {
  loadPoints(options: { signal?: AbortSignal }): Promise<TPointsData>;
}

export interface PointsData extends ItemsData {
  getDimensions(): string[];
  loadCoordinates(
    dimension: string,
    options: { signal?: AbortSignal },
  ): Promise<Float32Array>;
}
