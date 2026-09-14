import type { LabelsDataSource } from "@tissuumaps/core";

import {
  type OMEZarrDataSource,
  omeZarrDataSourceDefaults,
  omeZarrDataSourceType,
} from "./OMEZarrDataSource";

export const omeZarrLabelsDataSourceType = omeZarrDataSourceType;

export const omeZarrLabelsDataSourceDefaults = { ...omeZarrDataSourceDefaults };

export interface OMEZarrLabelsDataSource
  extends
    OMEZarrDataSource,
    LabelsDataSource<typeof omeZarrLabelsDataSourceType> {}

export type NormalizedOMEZarrLabelsDataSource = Required<
  Pick<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>
> &
  Omit<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>;
