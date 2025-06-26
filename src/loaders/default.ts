import { IImageData, ImageDataLoaderBase } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSource: { url: string } | { path: string };
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
  async loadImage(): Promise<DefaultImageData> {
    const tileSource = await this.loadTileSource();
    const imageData = new DefaultImageData(tileSource);
    return Promise.resolve(imageData);
  }

  private async loadTileSource(): Promise<string> {
    if ("url" in this.dataSource.tileSource) {
      return this.dataSource.tileSource.url;
    }
    if (this.projectDir === null) {
      throw new Error("Project directory is required to load local files.");
    }
    const path = this.dataSource.tileSource.path;
    const fh = await this.projectDir.getFileHandle(path);
    const file = await fh.getFile();
    return URL.createObjectURL(file); // FIXME revoke this URL when no longer needed
  }
}
