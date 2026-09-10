import type { ImageDataSource } from "@tissuumaps/core";

export const tiffImageDataSourceType = "tiff";

export const tiffImageDataSourceDefaults = {
  z: 0,
  t: 0,
};

export interface TIFFImageDataSource extends ImageDataSource<
  typeof tiffImageDataSourceType
> {
  z?: number;
  t?: number;
}

export type NormalizedTIFFImageDataSource = Required<
  Pick<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>
> &
  Omit<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>;
