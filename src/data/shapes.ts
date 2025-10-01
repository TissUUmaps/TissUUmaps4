import { RawShapesDataSource } from "../model/shapes";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type GeoJSONGeometry = object;

export interface ShapesData extends Data {
  getLength(): number;
  loadGeometries(signal?: AbortSignal): Promise<GeoJSONGeometry[]>;
}

export interface ShapesDataLoader<TShapesData extends ShapesData>
  extends DataLoader {
  loadShapes: (signal?: AbortSignal) => Promise<TShapesData>;
}

export type ShapesDataLoaderFactory = (
  dataSource: RawShapesDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<TableData>,
) => ShapesDataLoader<ShapesData>;
