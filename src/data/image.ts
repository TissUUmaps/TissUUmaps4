import { IImageDataSourceModel } from "../models/image";
import { IData, IDataLoader } from "./base";
import { CustomTileSource } from "./types";

export interface IImageData extends IData {
  readonly imageTileSource: string | CustomTileSource;
}

export interface IImageDataLoader extends IDataLoader {
  loadImage: (dataSource: IImageDataSourceModel<string>) => Promise<IImageData>;
}
