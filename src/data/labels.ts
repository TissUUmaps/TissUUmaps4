import { RawLabelsDataSource } from "../models/labels";
import { UintArray } from "../types";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

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
    signal?: AbortSignal,
  ): Promise<UintArray>;
}

export interface LabelsDataLoader<TLabelsData extends LabelsData>
  extends DataLoader {
  loadLabels(signal?: AbortSignal): Promise<TLabelsData>;
}

export type LabelsDataLoaderFactory = (
  dataSource: RawLabelsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<TableData>,
) => LabelsDataLoader<LabelsData>;
