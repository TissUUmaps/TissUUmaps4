import type { ImageDataSource } from "@tissuumaps/core";

/** Type discriminator of TIFF image data sources */
export const tiffImageDataSourceType = "tiff";

/** Default values for {@link TIFFImageDataSource} */
export const tiffImageDataSourceDefaults = {
  z: 0,
  t: 0,
};

/**
 * Data source for TIFF images
 *
 * The file is read from a URL (`url`) or from the open workspace (`path`).
 * OME-TIFF, QPTIFF and plain pyramidal TIFF are recognized by their metadata.
 */
export interface TIFFImageDataSource extends ImageDataSource<
  typeof tiffImageDataSourceType
> {
  /**
   * The z-plane to display, for OME-TIFF files with a z-stack
   *
   * @defaultValue `0`
   */
  z?: number;

  /**
   * The time point to display, for OME-TIFF files with a time series
   *
   * @defaultValue `0`
   */
  t?: number;
}

/**
 * A {@link TIFFImageDataSource} with {@link tiffImageDataSourceDefaults}
 * applied and its URL resolved
 */
export type NormalizedTIFFImageDataSource = Required<
  Pick<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>
> &
  Omit<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>;
