import { IData, IDataLoader } from "./base";

export interface ITableData extends IData {
  getIds(): number[];
  getColumns(): string[];
  loadColumn<T>(column: string): Promise<ArrayLike<T>>;
}

export interface ITableDataLoader<TTableData extends ITableData>
  extends IDataLoader {
  loadTable(): Promise<TTableData>;
}
