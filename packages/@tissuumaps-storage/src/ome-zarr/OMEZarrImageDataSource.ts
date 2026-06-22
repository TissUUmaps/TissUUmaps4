import type { ImageDataSource } from "@tissuumaps/core";

export const omeZarrImageDataSourceType = "ome-zarr";

export const omeZarrImageDataSourceDefaults = {};

export interface OMEZarrImageDataSource extends ImageDataSource<
  typeof omeZarrImageDataSourceType
> {
  t?: number;
  c?: number;
  z?: number;
}

export type DefaultOMEZarrImageDataSource = Required<
  Pick<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>
> &
  Omit<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>;

export function createDefaultOMEZarrImageDataSource(
  omeZarrImageDataSource: OMEZarrImageDataSource,
): DefaultOMEZarrImageDataSource {
  return {
    ...omeZarrImageDataSourceDefaults,
    ...omeZarrImageDataSource,
  };
}
