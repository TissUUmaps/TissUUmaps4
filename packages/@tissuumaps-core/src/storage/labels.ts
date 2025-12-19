import { type UintArray } from "../types/array";
import { type Data, type DataLoader } from "./base";

export interface LabelsDataLoader<
  TLabelsData extends LabelsData,
> extends DataLoader {
  loadLabels(options: { signal?: AbortSignal }): Promise<TLabelsData>;
}

export interface LabelsData extends Data {
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
    options: { signal?: AbortSignal },
  ): Promise<UintArray>;
}
