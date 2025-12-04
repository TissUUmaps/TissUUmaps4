import { ShapesDataSource } from "../model/shapes";
import { MultiPolygon } from "../types";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type ShapesDataLoaderFactory = (
  dataSource: ShapesDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ShapesDataLoader<ShapesData>;

export interface ShapesDataLoader<TShapesData extends ShapesData>
  extends DataLoader {
  loadShapes: (options: { signal?: AbortSignal }) => Promise<TShapesData>;
}

export interface ShapesData extends Data {
  getLength(): number;
  loadMultiPolygons(options: { signal?: AbortSignal }): Promise<MultiPolygon[]>;
}
