import { PointsDataSource } from "../model/points";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export interface PointsData extends Data {
  getLength(): number;
  getDimensions(): string[];
  loadCoordinates(
    dimension: string,
    signal?: AbortSignal,
  ): Promise<Float32Array>;
}

export interface PointsDataLoader<TPointsData extends PointsData>
  extends DataLoader {
  loadPoints(signal?: AbortSignal): Promise<TPointsData>;
}

export type PointsDataLoaderFactory = (
  dataSource: PointsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<TableData>,
) => PointsDataLoader<PointsData>;
