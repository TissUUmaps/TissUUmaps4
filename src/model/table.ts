import {
  DataObject,
  DataObjectKeysWithDefaults,
  DataSource,
  DataSourceKeysWithDefaults,
  completeDataObject,
  completeDataSource,
} from "./base";

/**
 * Tabular data
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Table extends DataObject<TableDataSource> {}

/**
 * {@link Table} properties that have default values
 *
 * @internal
 */
export type TableKeysWithDefaults = DataObjectKeysWithDefaults<TableDataSource>;

/**
 * A {@link Table} with default values applied
 *
 * @internal
 */
export type CompleteTable = Required<Pick<Table, TableKeysWithDefaults>> &
  Omit<Table, TableKeysWithDefaults>;

/**
 * Creates a {@link CompleteTable} from a {@link Table} by applying default values
 *
 * @param table - The raw table
 * @returns The complete table with default values applied
 *
 * @internal
 */
export function completeTable(table: Table): CompleteTable {
  return { ...completeDataObject(table), ...table };
}

/**
 * A data source for tabular data
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableDataSource<TType extends string = string>
  extends DataSource<TType> {}

/**
 * {@link TableDataSource} properties that have default values
 *
 * @internal
 */
export type TableDataSourceKeysWithDefaults<TType extends string = string> =
  DataSourceKeysWithDefaults<TType>;

/**
 * A {@link TableDataSource} with default values applied
 *
 * @internal
 */
export type CompleteTableDataSource<TType extends string = string> = Required<
  Pick<TableDataSource<TType>, TableDataSourceKeysWithDefaults<TType>>
> &
  Omit<TableDataSource<TType>, TableDataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompleteTableDataSource} from a {@link TableDataSource} by applying default values
 *
 * @param tableDataSource - The raw table data source
 * @returns The complete table data source with default values applied
 *
 * @internal
 */
export function completeTableDataSource<TType extends string = string>(
  tableDataSource: TableDataSource<TType>,
): CompleteTableDataSource<TType> {
  return { ...completeDataSource(tableDataSource), ...tableDataSource };
}
