import {
  type CustomTileSource,
  type ImageData,
  type ImageDataSource,
  type RawImageDataSource,
  type TileSourceConfig,
  createImageDataSource,
} from "@tissuumaps/core";

import { AbstractImageDataLoader } from "./base";

export const openSeadragonImageDataSourceType = "openseadragon";
export const openSeadragonImageDataSourceDefaults = {};

export interface RawOpenSeadragonImageDataSource extends RawImageDataSource<
  typeof openSeadragonImageDataSourceType
> {
  tileSourceConfig?: TileSourceConfig;
}

export type OpenSeadragonImageDataSource = ImageDataSource<
  typeof openSeadragonImageDataSourceType
> &
  Required<
    Pick<
      RawOpenSeadragonImageDataSource,
      keyof typeof openSeadragonImageDataSourceDefaults
    >
  > &
  Omit<
    RawOpenSeadragonImageDataSource,
    | keyof ImageDataSource<typeof openSeadragonImageDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof openSeadragonImageDataSourceDefaults
  >;

export function createOpenSeadragonImageDataSource(
  rawOpenSeadragonImageDataSource: RawOpenSeadragonImageDataSource,
): OpenSeadragonImageDataSource {
  return {
    ...createImageDataSource(rawOpenSeadragonImageDataSource),
    ...openSeadragonImageDataSourceDefaults,
    ...rawOpenSeadragonImageDataSource,
  };
}

export class OpenSeadragonImageDataLoader extends AbstractImageDataLoader<
  OpenSeadragonImageDataSource,
  OpenSeadragonImageData
> {
  async loadImage({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<OpenSeadragonImageData> {
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
      return new OpenSeadragonImageData(this.dataSource.tileSourceConfig);
    }
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const objectUrl = URL.createObjectURL(file);
      return new OpenSeadragonImageData(objectUrl, objectUrl);
    }
    if (this.dataSource.url !== undefined) {
      return new OpenSeadragonImageData(this.dataSource.url);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}

export class OpenSeadragonImageData implements ImageData {
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
