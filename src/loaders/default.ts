import { IImageData, ImageDataLoaderBase } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {}

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
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      const objectUrl = URL.createObjectURL(file);
      return [objectUrl, objectUrl];
    }
    if (this.dataSource.url !== undefined) {
      return [this.dataSource.url, null];
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
