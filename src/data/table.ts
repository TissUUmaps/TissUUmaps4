import { IData, IDataLoader } from "./base";
import { MappableArrayLike } from "./types";

export interface ITableData extends IData {
  getIds(): number[];
  getLength(): number;
  getColumns(): string[];
  loadColumn<T>(column: string): Promise<MappableArrayLike<T>>;
}

export interface ITableDataLoader<TTableData extends ITableData>
  extends IDataLoader {
  loadTable(): Promise<TTableData>;
}
