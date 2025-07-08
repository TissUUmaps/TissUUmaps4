import { IData, IDataLoader } from "./base";
import { ICustomTileSource } from "./types";

export interface IImageData extends IData {
  getChannels(): string[] | null;
  getTileSource(channel?: string): string | ICustomTileSource;
}

export interface IImageDataLoader<TImageData extends IImageData>
  extends IDataLoader {
  loadImage(abortSignal?: AbortSignal): Promise<TImageData>;
}
