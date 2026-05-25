import {
  type DataObject,
  type ItemsDataSource,
  type RawDataObject,
  type RawItemsDataSource,
  createDataObject,
  createItemsDataSource,
} from "./base";

/**
 * Default values for {@link RawTable}
 */
export const tableDefaults = {} as const satisfies Partial<RawTable>;

/**
 * Tabular data
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawTable extends RawDataObject<RawTableDataSource<string>> {}

/**
 * A {@link RawTable} with {@link tableDefaults} applied
 */
export type Table = DataObject<TableDataSource<string>> &
  Required<Pick<RawTable, keyof typeof tableDefaults>> &
  Omit<RawTable, keyof typeof tableDefaults>;

/**
 * Creates a {@link Table} from a {@link RawTable} by applying {@link tableDefaults}
 *
 * @param rawTable - The raw table
 * @returns The complete table with default values applied
 */
export function createTable(rawTable: RawTable): Table {
  return {
    ...createDataObject(rawTable),
    ...structuredClone(tableDefaults),
    ...structuredClone(rawTable),
    dataSource: createTableDataSource(rawTable.dataSource),
  };
}

/**
 * Default values for {@link RawTableDataSource}
 */
export const tableDataSourceDefaults = {} as const satisfies Partial<
  RawTableDataSource<string>
>;

/**
 * A data source for tabular data
 */

export interface RawTableDataSource<
  TType extends string = string,
> extends RawItemsDataSource<TType> {
  table?: never;
}

/**
 * A {@link RawTableDataSource} with {@link tableDataSourceDefaults} applied
 */
export type TableDataSource<TType extends string = string> =
  ItemsDataSource<TType> &
    Required<
      Pick<RawTableDataSource<TType>, keyof typeof tableDataSourceDefaults>
    > &
    Omit<RawTableDataSource<TType>, keyof typeof tableDataSourceDefaults> & {
      table?: never;
    };

/**
 * Creates a {@link TableDataSource} from a {@link RawTableDataSource} by applying {@link tableDataSourceDefaults}
 *
 * @param rawTableDataSource - The raw table data source
 * @returns The complete table data source with default values applied
 */
export function createTableDataSource<TType extends string>(
  rawTableDataSource: RawTableDataSource<TType>,
): TableDataSource<TType> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { table, ...itemsDataSourceWithoutTable } =
    createItemsDataSource(rawTableDataSource);
  return {
    ...itemsDataSourceWithoutTable,
    ...structuredClone(tableDataSourceDefaults),
    ...structuredClone(rawTableDataSource),
  };
}
