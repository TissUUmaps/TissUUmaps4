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

export interface RawCSVTableDataSource extends RawTableDataSource<
  typeof csvTableDataSourceType
> {
  columns?: string[];
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
