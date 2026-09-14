import type { DataSource } from "@tissuumaps/core";

/** Type discriminator of OME-Zarr data sources, shared by all OME-Zarr data types */
export const omeZarrDataSourceType = "ome-zarr";

/** Default values for {@link OMEZarrDataSource} */
export const omeZarrDataSourceDefaults = {};

/**
 * Data source shared by all OME-Zarr data types
 *
 * OME-Zarr data is loaded from a remote OME-Zarr store (`url`), a remote
 * zipped OME-Zarr file (`url` ending in `.ozx`), or a zipped OME-Zarr file in
 * the open workspace (`path`).
 *
 * Images with more than two spatial dimensions are opened as a single plane:
 * `z` and `t` select the plane, and default to the image's `omero` defaults
 * (or the middle of the axis without them).
 */
export interface OMEZarrDataSource extends DataSource<
  typeof omeZarrDataSourceType
> {
  /** Timepoint index (0-based) to open, for images with a `t` axis */
  t?: number;

  /** Z-slice index (0-based) to open, for images with a `z` axis */
  z?: number;
}
