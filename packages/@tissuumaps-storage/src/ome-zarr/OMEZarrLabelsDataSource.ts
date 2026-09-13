import type { LabelsDataSource } from "@tissuumaps/core";

export const omeZarrLabelsDataSourceType = "ome-zarr";

export const omeZarrLabelsDataSourceDefaults = {};

export interface OMEZarrLabelsDataSource extends LabelsDataSource<
  typeof omeZarrLabelsDataSourceType
> {
  t?: number;
  z?: number;
}

export type NormalizedOMEZarrLabelsDataSource = Required<
  Pick<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>
> &
  Omit<OMEZarrLabelsDataSource, keyof typeof omeZarrLabelsDataSourceDefaults>;
