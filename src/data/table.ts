import { ITableDataSourceModel } from "../models/table";
import { IData, IDataLoader } from "./base";
import { TypedArray, UintArray } from "./types";

export interface ITableData extends IData {
  getIndex(): UintArray;
  getColumns(): string[];
  loadColumnData(column: string): Promise<string[] | TypedArray>;
}

export interface ITableDataLoader<
  TTableDataSourceModel extends ITableDataSourceModel<string>,
  TTableData extends ITableData,
> extends IDataLoader<TTableDataSourceModel> {
  loadTable: (abortSignal?: AbortSignal) => Promise<TTableData>;
}
