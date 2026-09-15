import type { ShapesDataSource } from "@tissuumaps/core";

export const parquetShapesDataSourceType = "parquet";

export const parquetShapesDataSourceDefaults = {};

export interface ParquetShapesDataSource extends ShapesDataSource<
  typeof parquetShapesDataSourceType
> {
  geometryColumn?: string;
  idColumn?: string;
  nameColumn?: string;
  requestHeaders?: { [headerName: string]: string };
}

export type NormalizedParquetShapesDataSource = Required<
  Pick<ParquetShapesDataSource, keyof typeof parquetShapesDataSourceDefaults>
> &
  Omit<ParquetShapesDataSource, keyof typeof parquetShapesDataSourceDefaults>;
