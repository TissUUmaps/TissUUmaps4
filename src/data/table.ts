import { ITableDataSourceModel } from "../models/table";
import { IData, IDataLoader } from "./base";
import { IntArray, TypedArray, UintArray } from "./types";

export interface ITableData extends IData {
  readonly columns: string[];
  readonly index: IntArray | UintArray;
  getColumnData(column: string): string[] | TypedArray;
}

export interface ITableDataLoader<
  TTableDataSourceModel extends ITableDataSourceModel<string>,
> extends IDataLoader {
  loadTable: (dataSource: TTableDataSourceModel) => Promise<ITableData>;
}
