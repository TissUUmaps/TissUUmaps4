import type { ImageDataSource } from "@tissuumaps/core";

import {
  type OMEZarrDataSource,
  omeZarrDataSourceDefaults,
  omeZarrDataSourceType,
} from "./OMEZarrDataSource";

export const omeZarrImageDataSourceType = omeZarrDataSourceType;

export const omeZarrImageDataSourceDefaults = { ...omeZarrDataSourceDefaults };

export interface OMEZarrImageDataSource
  extends
    OMEZarrDataSource,
    ImageDataSource<typeof omeZarrImageDataSourceType> {}

export type NormalizedOMEZarrImageDataSource = Required<
  Pick<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>
> &
  Omit<OMEZarrImageDataSource, keyof typeof omeZarrImageDataSourceDefaults>;
