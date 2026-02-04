import * as papaparse from "papaparse";

import {
  type RawTableDataSource,
  type TableDataSource,
  createTableDataSource,
} from "@tissuumaps/core";

export const csvTableDataSourceType = "csv";
export const csvTableDataSourceDefaults = {
  chunkSize: 10000,
  parseConfig: {
    delimiter: ",",
  },
};
export const csvTableDataSourceSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
    },
    // TODO path
    // TODO columns
    idColumn: {
      type: "string",
    },
    // TODO loadColumns
    // TODO chunkSize
    // TODO parseConfig
  },
  required: ["url"], // TODO ... or path
};
export const csvTableDataSourceUISchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/url",
      label: "URL",
    },
    // TODO path
    // TODO columns
    {
      type: "Control",
      scope: "#/properties/idColumn",
      label: "ID Column",
    },
    // TODO loadColumns
    // TODO chunkSize
    // TODO parseConfig
  ],
};

export interface RawCSVTableDataSource extends RawTableDataSource<
  typeof csvTableDataSourceType
> {
  columns?: string[];
  idColumn?: string;
  loadColumns?: string[];
  chunkSize?: number;
  parseConfig?: Pick<
    papaparse.ParseConfig,
    | "delimiter"
    | "newline"
    | "quoteChar"
    | "escapeChar"
    | "preview"
    | "comments"
    | "fastMode"
    | "skipFirstNLines"
  > &
    Pick<papaparse.ParseLocalConfig, "encoding"> &
    Pick<
      papaparse.ParseRemoteConfig,
      "downloadRequestHeaders" | "downloadRequestBody" | "withCredentials"
    >;
}

export type CSVTableDataSource = TableDataSource<
  typeof csvTableDataSourceType
> &
  Required<
    Pick<RawCSVTableDataSource, keyof typeof csvTableDataSourceDefaults>
  > &
  Omit<
    RawCSVTableDataSource,
    | keyof TableDataSource<typeof csvTableDataSourceType>
    | keyof typeof csvTableDataSourceDefaults
  >;

export function createCSVTableDataSource(
  rawCSVTableDataSource: RawCSVTableDataSource,
): CSVTableDataSource {
  return {
    ...createTableDataSource(rawCSVTableDataSource),
    ...csvTableDataSourceDefaults,
    ...rawCSVTableDataSource,
  };
}
