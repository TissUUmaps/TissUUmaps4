import { type UintArray } from "../types";
import { type DataLoader, type ItemsData } from "./base";

export interface LabelsDataLoader<
  TLabelsData extends LabelsData,
> extends DataLoader {
  loadLabels(options: { signal?: AbortSignal }): Promise<TLabelsData>;
}

export interface LabelsData extends ItemsData {
  getWidth(level?: number): number;
  getHeight(level?: number): number;
  getLevelCount(): number;
  getLevelScale(level: number): number;
  getTileWidth(level: number): number;
  getTileHeight(level: number): number;
  loadTile(
    level: number,
    x: number,
    y: number,
    options: { signal?: AbortSignal },
  ): Promise<UintArray>;
}
