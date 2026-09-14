import type { ImageDataSource } from "@tissuumaps/core";

import {
  type OMEZarrDataSource,
  omeZarrDataSourceDefaults,
  omeZarrDataSourceType,
} from "./OMEZarrDataSource";

/** Type discriminator of OME-Zarr image data sources (see {@link omeZarrDataSourceType}) */
export const omeZarrImageDataSourceType = omeZarrDataSourceType;

/** Default values for {@link OMEZarrImageDataSource} */
export const omeZarrImageDataSourceDefaults = { ...omeZarrDataSourceDefaults };

/**
 * Data source for OME-Zarr images
 *
 * Images with a channel axis of more than one channel are opened as
 * multi-channel image data with one tile source per channel; all others as
 * single-channel image data (see {@link OMEZarrDataSource} for the fields).
 */
export interface OMEZarrImageDataSource
  extends
    OMEZarrDataSource,
    ImageDataSource<typeof omeZarrImageDataSourceType> {}

/**
 * An {@link OMEZarrImageDataSource} with {@link omeZarrImageDataSourceDefaults}
 * applied and its URL resolved
 */
export type NormalizedOMEZarrImageDataSource = Required<
  Pick<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>
> &
  Omit<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>;
