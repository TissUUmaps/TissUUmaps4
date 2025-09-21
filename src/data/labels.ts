import { IData, IDataLoader } from "./base";
import { UintArray } from "./types";

export interface ILabelsData extends IData {
  getWidth(level?: number): number;
  getHeight(level?: number): number;
  getLevelCount(): number;
  getLevelScale(level: number): number;
  getTileWidth(level: number): number | undefined;
  getTileHeight(level: number): number | undefined;
  loadTile(
    level: number,
    x: number,
    y: number,
    signal?: AbortSignal,
  ): Promise<UintArray>;
}

export interface ILabelsDataLoader<TLabelsData extends ILabelsData>
  extends IDataLoader {
  loadLabels(signal?: AbortSignal): Promise<TLabelsData>;
}
