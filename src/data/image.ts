import { IImageDataSourceModel } from "../models/image";
import { IData, IDataLoader } from "./base";
import { ICustomTileSource } from "./types";

export interface IImageData extends IData {
  getChannels(): string[] | undefined;
  getTileSource(channel?: string): string | ICustomTileSource;
}

export interface IImageDataLoader<
  TImageDataSourceModel extends IImageDataSourceModel<string>,
  TImageData extends IImageData,
> extends IDataLoader<TImageDataSourceModel> {
  loadImage: (
    t?: number,
    z?: number,
    abortSignal?: AbortSignal,
  ) => Promise<TImageData>;
}
