import type {
  ParseConfig,
  ParseLocalConfig,
  ParseRemoteConfig,
} from "papaparse";

import type { TableDataSource } from "@tissuumaps/core";

export const csvTableDataSourceType = "csv";

export const csvTableDataSourceDefaults = {
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
  parseConfig?: Pick<
    ParseConfig,
    | "delimiter"
    | "newline"
    | "quoteChar"
    | "escapeChar"
    | "preview"
    | "comments"
    | "fastMode"
    | "skipFirstNLines"
  > &
    Pick<ParseLocalConfig, "encoding"> &
    Pick<
      ParseRemoteConfig,
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
