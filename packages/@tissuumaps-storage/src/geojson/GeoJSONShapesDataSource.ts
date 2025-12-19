import {
  type RawShapesDataSource,
  type ShapesDataSource,
  createShapesDataSource,
} from "@tissuumaps/core";

export const geoJSONShapesDataSourceType = "geojson";
export const geoJSONShapesDataSourceDefaults = {};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawGeoJSONShapesDataSource extends RawShapesDataSource<
  typeof geoJSONShapesDataSourceType
> {}

export type GeoJSONShapesDataSource = ShapesDataSource<
  typeof geoJSONShapesDataSourceType
> &
  Required<
    Pick<
      RawGeoJSONShapesDataSource,
      keyof typeof geoJSONShapesDataSourceDefaults
    >
  > &
  Omit<
    RawGeoJSONShapesDataSource,
    | keyof ShapesDataSource<typeof geoJSONShapesDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof geoJSONShapesDataSourceDefaults
  >;

export function createGeoJSONShapesDataSource(
  rawGeoJSONShapesDataSource: RawGeoJSONShapesDataSource,
): GeoJSONShapesDataSource {
  return {
    ...createShapesDataSource(rawGeoJSONShapesDataSource),
    ...geoJSONShapesDataSourceDefaults,
    ...rawGeoJSONShapesDataSource,
  };
}
