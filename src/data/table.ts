import { ITableDataSourceModel } from "../models/table";
import { IData, IDataLoader } from "./base";

export interface ITableData extends IData {
  getIndex(): number[];
  getColumns(): string[];
  loadColumnData(column: string): Promise<unknown[]>;
}

export interface ITableDataLoader<
  TTableDataSourceModel extends ITableDataSourceModel<string>,
  TTableData extends ITableData,
> extends IDataLoader<TTableDataSourceModel> {
  loadTable: () => Promise<TTableData>;
}
