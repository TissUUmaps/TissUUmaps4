import { IData, IDataLoader } from "./base";
import { MappableArrayLike } from "./types";

export interface ITableData extends IData {
  getLength(): number;
  getColumns(): string[];
  loadColumn<T>(
    column: string,
    signal?: AbortSignal,
  ): Promise<MappableArrayLike<T>>;
}

export interface ITableDataLoader<TTableData extends ITableData>
  extends IDataLoader {
  loadTable(signal?: AbortSignal): Promise<TTableData>;
}
