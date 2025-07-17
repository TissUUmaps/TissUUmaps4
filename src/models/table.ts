import { IDataModel, IDataSourceModel } from "./base";

/** A table */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITableModel extends IDataModel<ITableDataSourceModel> {}

/** A data source for tables */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITableDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}
