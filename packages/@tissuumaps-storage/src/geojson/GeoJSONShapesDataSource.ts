import {
  type RawShapesDataSource,
  type ShapesDataSource,
  createShapesDataSource,
} from "@tissuumaps/core";

export const geoJSONShapesDataSourceType = "geojson";
export const geoJSONShapesDataSourceDefaults = {};

export interface RawGeoJSONShapesDataSource extends RawShapesDataSource<
  typeof geoJSONShapesDataSourceType
> {
  idProperty?: string;
}

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
