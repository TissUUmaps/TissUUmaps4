import { PointsDataSource } from "../model/points";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type PointsDataLoaderFactory = (
  dataSource: PointsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => PointsDataLoader<PointsData>;

export interface PointsDataLoader<TPointsData extends PointsData>
  extends DataLoader {
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
