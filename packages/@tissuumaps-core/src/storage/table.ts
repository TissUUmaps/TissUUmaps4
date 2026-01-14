import { type MappableArrayLike } from "../types";
import { type DataLoader, type ItemsData } from "./base";

export interface TableDataLoader<
  TTableData extends TableData,
> extends DataLoader {
  loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}

export interface TableData extends ItemsData {
  getColumns(): string[];
  loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>>;
}
