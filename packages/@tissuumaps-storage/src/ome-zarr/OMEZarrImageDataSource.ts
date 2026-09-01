import type { ImageDataSource } from "@tissuumaps/core";

export const omeZarrImageDataSourceType = "ome-zarr";

export const omeZarrImageDataSourceDefaults = {};

export interface OMEZarrImageDataSource extends ImageDataSource<
  typeof omeZarrImageDataSourceType
> {
  t?: number;
  z?: number;
  sizeC?: number;
}

export type DefaultOMEZarrImageDataSource = Required<
  Pick<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>
> &
  Omit<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>;
