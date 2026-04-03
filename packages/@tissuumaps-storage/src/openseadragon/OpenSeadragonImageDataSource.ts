import { type ImageDataSource, type TileSourceConfig } from "@tissuumaps/core";

export const openSeadragonImageDataSourceType = "openseadragon";

export const openSeadragonImageDataSourceDefaults = {};

export interface OpenSeadragonImageDataSource extends ImageDataSource<
  typeof openSeadragonImageDataSourceType
> {
  tileSourceConfig?: TileSourceConfig;
}

export type DefaultOpenSeadragonImageDataSource = Required<
  Pick<
    OpenSeadragonImageDataSource,
    keyof typeof openSeadragonImageDataSourceDefaults
  >
> &
  Omit<
    OpenSeadragonImageDataSource,
    keyof typeof openSeadragonImageDataSourceDefaults
  >;

export function createDefaultOpenSeadragonImageDataSource(
  openSeadragonImageDataSource: OpenSeadragonImageDataSource,
): DefaultOpenSeadragonImageDataSource {
  return {
    ...openSeadragonImageDataSourceDefaults,
    ...openSeadragonImageDataSource,
  };
}
