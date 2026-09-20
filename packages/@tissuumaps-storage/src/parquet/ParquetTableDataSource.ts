import type { TableDataSource } from "@tissuumaps/core";

export const parquetTableDataSourceType = "parquet";

export const parquetTableDataSourceDefaults = {};

export interface ParquetTableDataSource extends TableDataSource<
  typeof parquetTableDataSourceType
> {
  source: string;
  idColumn?: string;
  nameColumn?: string;
  requestHeaders?: { [headerName: string]: string };
}

export type NormalizedParquetTableDataSource = Required<
  Pick<ParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>
> &
  Omit<ParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>;
