import { IData, IDataLoader } from "./base";

export interface ITableData extends IData {
  getIds(): number[];
  getColumns(): string[];
  loadColumnData<T>(column: string): Promise<T[]>;
}

export interface ITableDataLoader<TTableData extends ITableData>
  extends IDataLoader {
  loadTable(): Promise<TTableData>;
}
