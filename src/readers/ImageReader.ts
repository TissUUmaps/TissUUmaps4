import { TileSource } from "openseadragon";

export type TileSourceSpec = object;

export default interface ImageReader {
  getTileSource(): string | TileSourceSpec | TileSource;
}

export interface ImageReaderOptions<T extends string> {
  type: T;
}
