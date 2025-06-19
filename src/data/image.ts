import { IImageDataSourceModel } from "../models/image";
import { IData, IDataLoader } from "./base";
import { ICustomTileSource } from "./types";

export interface IImageData extends IData {
  readonly tileSource: string | ICustomTileSource;
}

export interface IImageDataLoader<
  TImageDataSourceModel extends IImageDataSourceModel<string>,
> extends IDataLoader {
  loadImage: (dataSource: TImageDataSourceModel) => Promise<IImageData>;
}
