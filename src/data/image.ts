import { IImageDataSourceModel } from "../models/image";
import { IData, IDataLoader } from "./base";
import { ICustomTileSource } from "./types";

export interface IImageData extends IData {
  getTileSource(): string | ICustomTileSource;
}

export interface IImageDataLoader<
  TImageDataSourceModel extends IImageDataSourceModel<string>,
  TImageData extends IImageData,
> extends IDataLoader<TImageDataSourceModel> {
  loadImage: (abortSignal?: AbortSignal) => Promise<TImageData>;
}
