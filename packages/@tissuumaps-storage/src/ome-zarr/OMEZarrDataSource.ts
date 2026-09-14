import type { DataSource } from "@tissuumaps/core";

export const omeZarrDataSourceType = "ome-zarr";

export const omeZarrDataSourceDefaults = {};

/**
 * Data source shared by all OME-Zarr data types
 *
 * OME-Zarr data is loaded from a remote OME-Zarr store (`url`), a remote
 * zipped OME-Zarr file (`url` ending in `.ozx`), or a zipped OME-Zarr file in
 * the open workspace (`path`).
 */
export interface OMEZarrDataSource extends DataSource<
  typeof omeZarrDataSourceType
> {
  /** Timepoint index (0-based) to open, for images with a `t` axis */
  t?: number;

  /** Z-slice index (0-based) to open, for images with a `z` axis */
  z?: number;
}
