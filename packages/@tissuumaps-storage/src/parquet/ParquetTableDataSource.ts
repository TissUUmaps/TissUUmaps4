import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

import {
  type RawTableDataSource,
  type TableDataSource,
  createTableDataSource,
} from "@tissuumaps/core";

export const parquetTableDataSourceType = "parquet";
export const parquetTableDataSourceDefaults = {};
export const parquetTableDataSourceSchema: JsonSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
    },
    // TODO path
    idColumn: {
      type: "string",
    },
  },
  required: ["url"], // TODO ... or path
};
export const parquetTableDataSourceUISchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/url",
      label: "URL",
    },
    // TODO path
    {
      type: "Control",
      scope: "#/properties/idColumn",
      label: "ID Column",
    },
  ],
};

export interface RawParquetTableDataSource extends RawTableDataSource<
  typeof parquetTableDataSourceType
> {
  idColumn?: string;
  requestHeaders?: { [headerName: string]: string };
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
