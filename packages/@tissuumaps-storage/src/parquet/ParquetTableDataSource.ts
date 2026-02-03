import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

import {
  type RawTableDataSource,
  type TableDataSource,
  createTableDataSource,
} from "@tissuumaps/core";

export const parquetTableDataSourceType = "parquet";
export const parquetTableDataSourceDefaults = {};
export const parquetTableDataSourceSchema: JsonSchema = {
  // TODO JSON schema
};
export const parquetTableDataSourceUISchema: UISchemaElement = {
  type: "VerticalLayout",
  // TODO UI schema
};

export interface RawParquetTableDataSource extends RawTableDataSource<
  typeof parquetTableDataSourceType
> {
  idColumn?: string;
  headers?: { [headerName: string]: string };
}

export type ParquetTableDataSource = TableDataSource<
  typeof parquetTableDataSourceType
> &
  Required<
    Pick<RawParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>
  > &
  Omit<
    RawParquetTableDataSource,
    | keyof TableDataSource<typeof parquetTableDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof parquetTableDataSourceDefaults
  >;

export function createParquetTableDataSource(
  rawParquetTableDataSource: RawParquetTableDataSource,
): ParquetTableDataSource {
  return {
    ...createTableDataSource(rawParquetTableDataSource),
    ...parquetTableDataSourceDefaults,
    ...rawParquetTableDataSource,
  };
}
