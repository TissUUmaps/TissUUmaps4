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
 * The `source` refers to a remote TIFF file (a URL) or to a TIFF file in the
 * open workspace (a workspace-relative or project-relative path). OME-TIFF,
 * QPTIFF and plain pyramidal TIFF are recognized by their metadata.
 */
export interface TIFFImageDataSource extends ImageDataSource<
  typeof tiffImageDataSourceType
> {
  /** URL or path of the TIFF file (see `SourceUtils`) */
  source: string;

  /**
   * The z-slice to display, for OME-TIFF files with a z-stack
   *
   * @defaultValue `0`
   */
  z?: number;

  /**
   * The timepoint to display, for OME-TIFF files with a time series
   *
   * @defaultValue `0`
   */
  t?: number;
}

/**
 * A {@link TIFFImageDataSource} with {@link tiffImageDataSourceDefaults}
 * applied and its source normalized
 */
export type NormalizedTIFFImageDataSource = Required<
  Pick<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>
> &
  Omit<TIFFImageDataSource, keyof typeof tiffImageDataSourceDefaults>;
