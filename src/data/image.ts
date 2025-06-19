import { IImageDataSourceModel } from "../models/image";
import { IData, IDataLoader } from "./base";
import { CustomTileSource } from "./types";

export interface IImageData extends IData {
  readonly tileSource: string | CustomTileSource;
}

export interface IImageDataLoader<
  TImageDataSourceModel extends IImageDataSourceModel<string>,
> extends IDataLoader {
  loadImage: (dataSource: TImageDataSourceModel) => Promise<IImageData>;
}
