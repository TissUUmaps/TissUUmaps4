import type * as papaparse from "papaparse";

import { type TableDataSource } from "@tissuumaps/core";

export const csvTableDataSourceType = "csv";

export const csvTableDataSourceDefaults = {
  chunkSize: 10000,
  parseConfig: {
    delimiter: ",",
  },
};

export interface CSVTableDataSource extends TableDataSource<
  typeof csvTableDataSourceType
> {
  columns?: string[];
  idColumn?: string;
  nameColumn?: string;
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

export type DefaultCSVTableDataSource = Required<
  Pick<CSVTableDataSource, keyof typeof csvTableDataSourceDefaults>
> &
  Omit<CSVTableDataSource, keyof typeof csvTableDataSourceDefaults>;

export function createDefaultCSVTableDataSource(
  csvTableDataSource: CSVTableDataSource,
): DefaultCSVTableDataSource {
  return { ...csvTableDataSourceDefaults, ...csvTableDataSource };
}
