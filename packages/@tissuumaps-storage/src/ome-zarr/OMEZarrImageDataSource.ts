import type { ImageDataSource } from "@tissuumaps/core";

/** Type discriminator of OME-Zarr image data sources */
export const omeZarrImageDataSourceType = "ome-zarr";

/** Default values for {@link OMEZarrImageDataSource} */
export const omeZarrImageDataSourceDefaults = {};

/**
 * Data source for OME-Zarr images
 *
 * The image is loaded from a remote OME-Zarr store (`url`), a remote zipped
 * OME-Zarr file (`url` ending in `.ozx`), or a zipped OME-Zarr file in the
 * open workspace (`path`).
 *
 * Images with a channel axis of more than one channel are opened as
 * multi-channel image data with one tile source per channel; all others as
 * single-channel image data.
 *
 * Images with more than two spatial dimensions are opened as a single plane:
 * `z` and `t` select the plane, and default to the image's `omero` defaults
 * (or the middle of the axis without them).
 */
export interface OMEZarrImageDataSource extends ImageDataSource<
  typeof omeZarrImageDataSourceType
> {
  /** Timepoint index (0-based) to open, for images with a `t` axis */
  t?: number;

  /** Z-slice index (0-based) to open, for images with a `z` axis */
  z?: number;
}

/**
 * An {@link OMEZarrImageDataSource} with {@link omeZarrImageDataSourceDefaults}
 * applied and its URL resolved
 */
export type NormalizedOMEZarrImageDataSource = Required<
  Pick<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>
> &
  Omit<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>;
