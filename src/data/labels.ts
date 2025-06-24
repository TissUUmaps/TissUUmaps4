import { ILabelsDataSourceModel } from "../models/labels";
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
    abortSignal?: AbortSignal,
  ): Promise<UintArray>;
}

export interface ILabelsDataLoader<
  TLabelsDataSourceModel extends ILabelsDataSourceModel<string>,
> extends IDataLoader {
  loadLabels: (dataSource: TLabelsDataSourceModel) => Promise<ILabelsData>;
}
