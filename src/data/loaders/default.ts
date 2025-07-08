import { IImageDataSourceModel } from "../../models/image";
import { IImageData } from "../image";
import { ICustomTileSource } from "../types";
import { ImageDataLoaderBase } from "./base";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {}

export class DefaultImageData implements IImageData {
  private readonly _tileSource: string;
  private readonly _objectUrl: string | null;

  constructor(tileSource: string, objectUrl: string | null) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getChannels(): string[] | null {
    return null;
  }

  getTileSource(): string | ICustomTileSource {
    return this._tileSource;
  }

  destroy(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}

export class DefaultImageDataLoader extends ImageDataLoaderBase<
  IDefaultImageDataSourceModel,
  DefaultImageData
> {
  async loadImage(): Promise<DefaultImageData> {
    const [tileSource, objectUrl] = await this._loadTileSource();
    return new DefaultImageData(tileSource, objectUrl);
  }

  private async _loadTileSource(): Promise<[string, string | null]> {
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
