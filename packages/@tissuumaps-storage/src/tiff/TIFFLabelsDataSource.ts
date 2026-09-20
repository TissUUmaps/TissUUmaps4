import type { LabelsDataSource } from "@tissuumaps/core";

/** Type discriminator of TIFF labels data sources */
export const tiffLabelsDataSourceType = "tiff";

/** Default values for {@link TIFFLabelsDataSource} */
export const tiffLabelsDataSourceDefaults = {
  z: 0,
  t: 0,
};

/**
 * Data source for label masks stored in TIFF files
 *
 * The `source` refers to a remote TIFF file (a URL) or to a TIFF file in the
 * open workspace (a workspace-relative or project-relative path), and its
 * formats are recognized as for TIFF images. It has to hold a single channel
 * of signed or unsigned integers of at most 32 bits, which are the label IDs
 * (see `LabelsDataSource` for the annotation table reference).
 */
export interface TIFFLabelsDataSource extends LabelsDataSource<
  typeof tiffLabelsDataSourceType
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
 * A {@link TIFFLabelsDataSource} with {@link tiffLabelsDataSourceDefaults}
 * applied and its source normalized
 */
export type NormalizedTIFFLabelsDataSource = Required<
  Pick<TIFFLabelsDataSource, keyof typeof tiffLabelsDataSourceDefaults>
> &
  Omit<TIFFLabelsDataSource, keyof typeof tiffLabelsDataSourceDefaults>;
