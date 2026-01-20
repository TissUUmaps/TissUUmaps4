import { type MappableArrayLike } from "../types";
import { type DataLoader, type ItemsData } from "./base";

export interface TableDataLoader<
  TTableData extends TableData,
> extends DataLoader {
  loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}

export interface TableData extends ItemsData {
  suggestColumnQueries(currentQuery: string): string[];
  getColumn(query: string): string | null;
  loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>>;
}
