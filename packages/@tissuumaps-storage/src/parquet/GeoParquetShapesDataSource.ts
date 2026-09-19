import type { ShapesDataSource } from "@tissuumaps/core";

export const geoParquetShapesDataSourceType = "geoparquet";

export const geoParquetShapesDataSourceDefaults = {};

export interface GeoParquetShapesDataSource extends ShapesDataSource<
  typeof geoParquetShapesDataSourceType
> {
  source: string;
  geometryColumn?: string;
  idColumn?: string;
  nameColumn?: string;
  requestHeaders?: { [headerName: string]: string };
}

export type NormalizedGeoParquetShapesDataSource = Required<
  Pick<
    GeoParquetShapesDataSource,
    keyof typeof geoParquetShapesDataSourceDefaults
  >
> &
  Omit<
    GeoParquetShapesDataSource,
    keyof typeof geoParquetShapesDataSourceDefaults
  >;
