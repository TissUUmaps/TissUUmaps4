import { IImageData, ImageDataLoaderBase } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSource: { url: string } | { localPath: string };
}

export class DefaultImageData implements IImageData {
  private readonly tileSource: string;
  private readonly objectUrl: string | null;

  constructor(tileSource: string, objectUrl: string | null) {
    this.tileSource = tileSource;
    this.objectUrl = objectUrl;
  }

  getChannels(): string[] | null {
    return null;
  }

  getTileSource(): string | ICustomTileSource {
    return this.tileSource;
  }

  destroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
}

export class DefaultImageDataLoader extends ImageDataLoaderBase<
  IDefaultImageDataSourceModel,
  DefaultImageData
> {
  async loadImage(): Promise<DefaultImageData> {
    const [tileSource, objectUrl] = await this.loadTileSource();
    return new DefaultImageData(tileSource, objectUrl);
  }

  private async loadTileSource(): Promise<[string, string | null]> {
    if ("url" in this.dataSource.tileSource) {
      return [this.dataSource.tileSource.url, null];
    }
    if (this.projectDir === null) {
      throw new Error("Project directory is required to load local files.");
    }
    const path = this.dataSource.tileSource.localPath;
    const fh = await this.projectDir.getFileHandle(path);
    const file = await fh.getFile();
    const objectUrl = URL.createObjectURL(file);
    return [objectUrl, objectUrl];
  }
}
