import {
  type DataObject,
  type DataSource,
  type RawDataObject,
  type RawDataSource,
  createDataObject,
  createDataSource,
} from "./base";

export const tableDefaults = {};

/**
 * Tabular data
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawTable extends RawDataObject<RawTableDataSource<string>> {}

/**
 * A {@link RawTable} with default values applied
 */
export type Table = DataObject<TableDataSource<string>> &
  Required<Pick<RawTable, keyof typeof tableDefaults>> &
  Omit<
    RawTable,
    | keyof DataObject<TableDataSource<string>>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof tableDefaults
  >;

/**
 * Creates a {@link Table} from a {@link RawTable} by applying default values
 *
 * @param rawTable - The raw table
 * @returns The complete table with default values applied
 */
export function createTable(rawTable: RawTable): Table {
  return {
    ...createDataObject(rawTable),
    ...tableDefaults,
    ...rawTable,
    dataSource: createTableDataSource(rawTable.dataSource),
  };
}

export const tableDataSourceDefaults = {};

/**
 * A data source for tabular data
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawTableDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawTableDataSource} with default values applied
 */
export type TableDataSource<TType extends string = string> = DataSource<TType> &
  Required<
    Pick<RawTableDataSource<TType>, keyof typeof tableDataSourceDefaults>
  > &
  Omit<
    RawTableDataSource<TType>,
    | keyof DataSource<TType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof tableDataSourceDefaults
  >;

/**
 * Creates a {@link TableDataSource} from a {@link RawTableDataSource} by applying default values
 *
 * @param rawTableDataSource - The raw table data source
 * @returns The complete table data source with default values applied
 */
export function createTableDataSource<TType extends string>(
  rawTableDataSource: RawTableDataSource<TType>,
): TableDataSource<TType> {
  return {
    ...createDataSource(rawTableDataSource),
    ...tableDataSourceDefaults,
    ...rawTableDataSource,
  };
}
