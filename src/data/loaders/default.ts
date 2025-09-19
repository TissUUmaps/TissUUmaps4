import { IImageDataSourceModel } from "../../models/image";
import { IImageData } from "../image";
import { ICustomTileSource, TileSourceConfig } from "../types";
import { ImageDataLoaderBase } from "./base";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface IDefaultImageDataSourceModel
  extends IImageDataSourceModel<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSourceConfig?: TileSourceConfig;
}

export class DefaultImageData implements IImageData {
  private readonly _tileSource: string | TileSourceConfig;
  private readonly _objectUrl: string | null;

  constructor(tileSource: string | TileSourceConfig, objectUrl: string | null) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getTileSource(): string | TileSourceConfig | ICustomTileSource {
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
    if (this.dataSource.tileSourceConfig !== undefined) {
      if (
        this.dataSource.url !== undefined ||
        this.dataSource.path !== undefined
      ) {
        throw new Error(
          "Specify either a tile source configuration or a URL/workspace path, not both.",
        );
      }
      return new DefaultImageData(this.dataSource.tileSourceConfig, null);
    }
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      const objectUrl = URL.createObjectURL(file);
      return new DefaultImageData(objectUrl, objectUrl);
    }
    if (this.dataSource.url !== undefined) {
      return new DefaultImageData(this.dataSource.url, null);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}
