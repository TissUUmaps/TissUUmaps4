import type { LabelsDataSource } from "@tissuumaps/core";

/** Type discriminator of OME-Zarr labels data sources */
export const omeZarrLabelsDataSourceType = "ome-zarr";

/** Default values for {@link OMEZarrLabelsDataSource} */
export const omeZarrLabelsDataSourceDefaults = {};

/**
 * Data source for OME-Zarr label images
 *
 * The label image is loaded from a remote OME-Zarr store (`url`), a remote
 * zipped OME-Zarr file (`url` ending in `.ozx`), or a zipped OME-Zarr file in
 * the open workspace (`path`). It is expected to hold signed or unsigned
 * integers of up to 32 bits; `image-label` metadata is not read (see
 * `LabelsDataSource` for
 * the annotation table reference).
 *
 * Label images with more than two spatial dimensions are opened as a single
 * plane: `z` and `t` select the plane, and default to the image's `omero`
 * defaults (or the middle of the axis without them).
 */
export interface OMEZarrLabelsDataSource extends LabelsDataSource<
  typeof omeZarrLabelsDataSourceType
> {
  /** Timepoint index (0-based) to open, for label images with a `t` axis */
  t?: number;

  /** Z-slice index (0-based) to open, for label images with a `z` axis */
  z?: number;
}

/**
 * An {@link OMEZarrLabelsDataSource} with {@link omeZarrLabelsDataSourceDefaults}
 * applied and its URL resolved
 */
export type NormalizedOMEZarrLabelsDataSource = Required<
  Pick<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>
> &
  Omit<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>;
