import { IDataModel, IDataSourceModel } from "./base";

/** A table */
export interface ITableModel extends IDataModel<ITableDataSourceModel<string>> {
  idCol: string;
}

/** A data source for tables */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITableDataSourceModel<TType extends string>
  extends IDataSourceModel<TType> {}
