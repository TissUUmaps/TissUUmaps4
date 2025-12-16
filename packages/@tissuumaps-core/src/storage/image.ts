import { type Data, type DataLoader } from "./base";

export interface ImageDataLoader<
  TImageData extends ImageData,
> extends DataLoader {
  loadImage(options: { signal?: AbortSignal }): Promise<TImageData>;
}

export interface ImageData extends Data {
  getTileSource(): string | TileSourceConfig | CustomTileSource;
}

export type TileSourceConfig = object;

export interface CustomTileSource {
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}
