import {
  ImageDataSource,
  ImageDataSourceKeysWithDefaults,
  completeImageDataSource,
} from "../../model/image";
import { CustomTileSource, ImageData, TileSourceConfig } from "../image";
import { AbstractImageDataLoader } from "./base";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface DefaultImageDataSource
  extends ImageDataSource<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSourceConfig?: TileSourceConfig;
}

export type DefaultImageDataSourceKeysWithDefaults =
  ImageDataSourceKeysWithDefaults<typeof DEFAULT_IMAGE_DATA_SOURCE>;

export type CompleteDefaultImageDataSource = Required<
  Pick<DefaultImageDataSource, DefaultImageDataSourceKeysWithDefaults>
> &
  Omit<DefaultImageDataSource, DefaultImageDataSourceKeysWithDefaults>;

export function completeDefaultImageDataSource(
  defaultImageDataSource: DefaultImageDataSource,
): CompleteDefaultImageDataSource {
  return {
    ...completeImageDataSource(defaultImageDataSource),
    ...defaultImageDataSource,
  };
}

export class DefaultImageDataLoader extends AbstractImageDataLoader<
  CompleteDefaultImageDataSource,
  DefaultImageData
> {
  async loadImage(
    options: { signal?: AbortSignal } = {},
  ): Promise<DefaultImageData> {
    const { signal } = options;
    signal?.throwIfAborted();
    if (this.dataSource.tileSourceConfig !== undefined) {
      if (
        this.dataSource.url !== undefined ||
        this.dataSource.path !== undefined
      ) {
        throw new Error(
          "Specify either a tile source configuration or a URL/workspace path, not both.",
        );
      }
      return new DefaultImageData(this.dataSource.tileSourceConfig);
    }
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const objectUrl = URL.createObjectURL(file);
      return new DefaultImageData(objectUrl, objectUrl);
    }
    if (this.dataSource.url !== undefined) {
      return new DefaultImageData(this.dataSource.url);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}

export class DefaultImageData implements ImageData {
  private readonly _tileSource: string | TileSourceConfig;
  private readonly _objectUrl?: string;

  constructor(tileSource: string | TileSourceConfig, objectUrl?: string) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  destroy(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
