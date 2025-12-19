import { type MappableArrayLike } from "../types/array";
import { type Data, type DataLoader } from "./base";

export interface TableDataLoader<
  TTableData extends TableData,
> extends DataLoader {
  loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}

export interface TableData extends Data {
  getLength(): number;
  getColumns(): string[];
  loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>>;
}
