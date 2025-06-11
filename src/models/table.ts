import { DataModelBase, DataSourceModelBase } from "./base";

/** A 2D raster image */
export interface TableModel
  extends DataModelBase<TableDataSourceModel<string>> {
  idCol: string;
}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableDataSourceModel<T extends string>
  extends DataSourceModelBase<T> {}
