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
  private readonly isObjectUrl: boolean;

  constructor(
    tileSource: string | ICustomTileSource,
    isObjectUrl: boolean = false,
  ) {
    this.tileSource = tileSource;
    this.isObjectUrl = isObjectUrl;
  }

  getChannels(): string[] | undefined {
    return undefined;
  }

  getTileSource(): string | ICustomTileSource {
    return this.tileSource;
  }

  destroy(): void {
    if (this.isObjectUrl) {
      URL.revokeObjectURL(this.tileSource as string);
    }
  }
}

export class DefaultImageDataLoader extends ImageDataLoaderBase<
  IDefaultImageDataSourceModel,
  DefaultImageData
> {
  async loadImage(): Promise<DefaultImageData> {
    if ("url" in this.dataSource.tileSource) {
      return new DefaultImageData(this.dataSource.tileSource.url);
    }
    if (this.projectDir === null) {
      throw new Error("Project directory is required to load local files.");
    }
    const path = this.dataSource.tileSource.path;
    const fh = await this.projectDir.getFileHandle(path);
    const file = await fh.getFile();
    const objectUrl = URL.createObjectURL(file);
    return new DefaultImageData(objectUrl, true);
  }
}
