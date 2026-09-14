import type { LabelsDataSource } from "@tissuumaps/core";

import {
  type OMEZarrDataSource,
  omeZarrDataSourceDefaults,
  omeZarrDataSourceType,
} from "./OMEZarrDataSource";

/** Type discriminator of OME-Zarr labels data sources (see {@link omeZarrDataSourceType}) */
export const omeZarrLabelsDataSourceType = omeZarrDataSourceType;

/** Default values for {@link OMEZarrLabelsDataSource} */
export const omeZarrLabelsDataSourceDefaults = { ...omeZarrDataSourceDefaults };

/**
 * Data source for OME-Zarr label images
 *
 * The label image is expected to hold unsigned integers of up to 32 bits;
 * `image-label` metadata is not read (see {@link OMEZarrDataSource} for the
 * fields, and `LabelsDataSource` for the annotation table reference).
 */
export interface OMEZarrLabelsDataSource
  extends
    OMEZarrDataSource,
    LabelsDataSource<typeof omeZarrLabelsDataSourceType> {}

/**
 * An {@link OMEZarrLabelsDataSource} with {@link omeZarrLabelsDataSourceDefaults}
 * applied and its URL resolved
 */
export type NormalizedOMEZarrLabelsDataSource = Required<
  Pick<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>
> &
  Omit<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>;
