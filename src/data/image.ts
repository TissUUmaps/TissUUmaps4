import { RawImageDataSource } from "../models/image";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type TileSourceConfig = object;

export interface CustomTileSource {
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}

export interface ImageData extends Data {
  getTileSource(): string | TileSourceConfig | CustomTileSource;
}

export interface ImageDataLoader<TImageData extends ImageData>
  extends DataLoader {
  loadImage(signal?: AbortSignal): Promise<TImageData>;
}

export type ImageDataLoaderFactory = (
  dataSource: RawImageDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<TableData>,
) => ImageDataLoader<ImageData>;
