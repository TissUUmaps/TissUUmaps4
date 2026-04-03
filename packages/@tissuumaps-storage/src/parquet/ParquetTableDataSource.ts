import { type TableDataSource } from "@tissuumaps/core";

export const parquetTableDataSourceType = "parquet";

export const parquetTableDataSourceDefaults = {};

export interface ParquetTableDataSource extends TableDataSource<
  typeof parquetTableDataSourceType
> {
  idColumn?: string;
  requestHeaders?: { [headerName: string]: string };
}

export type DefaultParquetTableDataSource = Required<
  Pick<ParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>
> &
  Omit<ParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>;

export function createDefaultParquetTableDataSource(
  parquetTableDataSource: ParquetTableDataSource,
): DefaultParquetTableDataSource {
  return { ...parquetTableDataSourceDefaults, ...parquetTableDataSource };
}
