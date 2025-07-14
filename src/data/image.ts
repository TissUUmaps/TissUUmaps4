import { IData, IDataLoader } from "./base";
import { ICustomTileSource, TileSourceConfig } from "./types";

export interface IImageData extends IData {
  getTileSource(): string | TileSourceConfig | ICustomTileSource;
}

export interface IImageDataLoader<TImageData extends IImageData>
  extends IDataLoader {
  loadImage(abortSignal?: AbortSignal): Promise<TImageData>;
}
