import { ShapesDataSource } from "../model/shapes";
import { MultiPolygon } from "../types";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export interface ShapesData extends Data {
  getLength(): number;
  loadPolygons(signal?: AbortSignal): Promise<MultiPolygon[]>;
}

export interface ShapesDataLoader<TShapesData extends ShapesData>
  extends DataLoader {
  loadShapes: (signal?: AbortSignal) => Promise<TShapesData>;
}

export type ShapesDataLoaderFactory = (
  dataSource: ShapesDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<TableData>,
) => ShapesDataLoader<ShapesData>;
