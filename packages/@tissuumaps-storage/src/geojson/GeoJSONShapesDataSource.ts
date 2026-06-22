import type { ShapesDataSource } from "@tissuumaps/core";

export const geoJSONShapesDataSourceType = "geojson";

export const geoJSONShapesDataSourceDefaults = {};

export interface GeoJSONShapesDataSource extends ShapesDataSource<
  typeof geoJSONShapesDataSourceType
> {
  idProperty?: string;
  nameProperty?: string;
}

export type DefaultGeoJSONShapesDataSource = Required<
  Pick<GeoJSONShapesDataSource, keyof typeof geoJSONShapesDataSourceDefaults>
> &
  Omit<GeoJSONShapesDataSource, keyof typeof geoJSONShapesDataSourceDefaults>;

export function createDefaultGeoJSONShapesDataSource(
  geoJSONShapesDataSource: GeoJSONShapesDataSource,
): DefaultGeoJSONShapesDataSource {
  return { ...geoJSONShapesDataSourceDefaults, ...geoJSONShapesDataSource };
}
