import { type MappableArrayLike } from "../types";
import { type DataLoader, type ItemsData } from "./base";

export interface TableDataLoader<
  TTableData extends TableData,
> extends DataLoader {
  loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}

export interface TableData extends ItemsData {
  suggestColumnQueries(currentQuery: string): Promise<string[]>;
  getColumn(query: string): Promise<string | null>;
  loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>>;
}
