import { type DataLoader, type ItemsData } from "./base";

export interface PointsDataLoader<
  TPointsData extends PointsData,
> extends DataLoader {
  loadPoints(options: { signal?: AbortSignal }): Promise<TPointsData>;
}

export interface PointsData extends ItemsData {
  suggestDimensionQueries(currentQuery: string): string[];
  getDimension(query: string): string | null;
  loadCoordinates(
    dimension: string,
    options: { signal?: AbortSignal },
  ): Promise<Float32Array>;
}
