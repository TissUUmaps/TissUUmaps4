import { IImageData, ImageDataLoaderBase } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

// TODO allow for local image files

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSource: string;
}

export class DefaultImageData implements IImageData {
  private readonly tileSource: string | ICustomTileSource;

  constructor(tileSource: string | ICustomTileSource) {
    this.tileSource = tileSource;
  }

  getChannels(): string[] | undefined {
    return undefined;
  }

  getTileSource(): string | ICustomTileSource {
    return this.tileSource;
  }
}

export class DefaultImageDataLoader extends ImageDataLoaderBase<
  IDefaultImageDataSourceModel,
  DefaultImageData
> {
  loadImage(): Promise<DefaultImageData> {
    const imageData = new DefaultImageData(this.dataSource.tileSource);
    return Promise.resolve(imageData);
  }
}
