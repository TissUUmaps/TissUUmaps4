import { RawImageDataSource, createImageDataSource } from "../../models/image";
import { CustomTileSource, ImageData, TileSourceConfig } from "../image";
import { AbstractImageDataLoader } from "./base";

export const DEFAULT_IMAGE_DATA_SOURCE = "default";

export interface RawDefaultImageDataSource
  extends RawImageDataSource<typeof DEFAULT_IMAGE_DATA_SOURCE> {
  tileSourceConfig?: TileSourceConfig;
}

type DefaultedDefaultImageDataSourceKeys = keyof Omit<
  RawDefaultImageDataSource,
  "type" | "url" | "path" | "tileSourceConfig"
>;

export type DefaultImageDataSource = Required<
  Pick<RawDefaultImageDataSource, DefaultedDefaultImageDataSourceKeys>
> &
  Omit<RawDefaultImageDataSource, DefaultedDefaultImageDataSourceKeys>;

export function createDefaultImageDataSource(
  rawDefaultImageDataSource: RawDefaultImageDataSource,
): DefaultImageDataSource {
  return {
    ...createImageDataSource(rawDefaultImageDataSource),
    ...rawDefaultImageDataSource,
  };
}

export class DefaultImageDataLoader extends AbstractImageDataLoader<
  DefaultImageDataSource,
  DefaultImageData
> {
  async loadImage(signal?: AbortSignal): Promise<DefaultImageData> {
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
