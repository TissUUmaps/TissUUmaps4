import {
  RawDataModel,
  RawDataSource,
  createDataModel,
  createDataSource,
} from "./base";

/** A table */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawTable extends RawDataModel<RawTableDataSource> {}

type DefaultedTableKeys = keyof Omit<RawTable, "id" | "name" | "dataSource">;

export type Table = Required<Pick<RawTable, DefaultedTableKeys>> &
  Omit<RawTable, DefaultedTableKeys>;

export function createTable(rawTable: RawTable): Table {
  return { ...createDataModel(rawTable), ...rawTable };
}

/** A data source for tables */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawTableDataSource<TType extends string = string>
  extends RawDataSource<TType> {}

type DefaultedTableDataSourceKeys<TType extends string = string> = keyof Omit<
  RawTableDataSource<TType>,
  "type" | "url" | "path"
>;

export type TableDataSource<TType extends string = string> = Required<
  Pick<RawTableDataSource<TType>, DefaultedTableDataSourceKeys<TType>>
> &
  Omit<RawTableDataSource<TType>, DefaultedTableDataSourceKeys<TType>>;

export function createTableDataSource<TType extends string = string>(
  rawTableDataSource: RawTableDataSource<TType>,
): TableDataSource<TType> {
  return { ...createDataSource(rawTableDataSource), ...rawTableDataSource };
}
