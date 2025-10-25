import { LabelsDataSource } from "../model/labels";
import { UintArray } from "../types";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type LabelsDataLoaderFactory = (
  dataSource: LabelsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => LabelsDataLoader<LabelsData>;

export interface LabelsDataLoader<TLabelsData extends LabelsData>
  extends DataLoader {
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
