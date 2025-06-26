import { IImageDataSourceModel } from "../models/image";
import { DataLoaderBase, IData, IDataLoader } from "./base";
import { ICustomTileSource } from "./types";

export interface IImageData extends IData {
  getChannels(): string[] | null;
  getTileSource(channel?: string): string | ICustomTileSource;
}

export interface IImageDataLoader<TImageData extends IImageData>
  extends IDataLoader {
  loadImage(abortSignal?: AbortSignal): Promise<TImageData>;
}

export abstract class ImageDataLoaderBase<
    TImageDataSourceModel extends IImageDataSourceModel<string>,
    TImageData extends IImageData,
  >
  extends DataLoaderBase<TImageDataSourceModel>
  implements IImageDataLoader<TImageData>
{
  abstract loadImage(abortSignal?: AbortSignal): Promise<TImageData>;
}
