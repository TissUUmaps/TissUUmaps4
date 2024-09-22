import { TileSource } from "openseadragon";

export type TileSourceSpec = string | object;

export default interface ImageReader {
  getTileSource(): TileSource | TileSourceSpec;
}

export interface ImageReaderOptions<T extends string> {
  type: T;
}
