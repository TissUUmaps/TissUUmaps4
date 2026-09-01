import type { PointsDataSource } from "@tissuumaps/core";

export const tablePointsDataSourceType = "table";

export const tablePointsDataSourceDefaults = {
  x: "x",
  y: "y",
};

export interface TablePointsDataSource extends PointsDataSource<
  typeof tablePointsDataSourceType
> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  table: string;
  x?: string;
  y?: string;
}

export type NormalizedTablePointsDataSource = Required<
  Pick<TablePointsDataSource, keyof typeof tablePointsDataSourceDefaults>
> &
  Omit<TablePointsDataSource, keyof typeof tablePointsDataSourceDefaults>;
