import { ImageDataSource } from "../model/image";
import { Data, DataLoader } from "./base";
import { TableData } from "./table";

export type ImageDataLoaderFactory = (
  dataSource: ImageDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ImageDataLoader<ImageData>;

export interface ImageDataLoader<TImageData extends ImageData>
  extends DataLoader {
  loadImage(options: { signal?: AbortSignal }): Promise<TImageData>;
}

export interface ImageData extends Data {
  getTileSource(): string | TileSourceConfig | CustomTileSource;
}

export type TileSourceConfig = object;

export interface CustomTileSource {
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}
