import { ITableDataSourceModel } from "../models/table";
import { IData, IDataLoader } from "./base";
import { IntArray, TypedArray, UintArray } from "./types";

export interface ITableData extends IData {
  index: IntArray | UintArray;
  columns: string[];
  getData(column: string): string[] | TypedArray;
}

export interface ITableDataLoader extends IDataLoader {
  loadTable: (dataSource: ITableDataSourceModel<string>) => Promise<ITableData>;
}
