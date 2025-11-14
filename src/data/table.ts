import { TableDataSource } from "../model/table";
import { MappableArrayLike } from "../types";
import { Data, DataLoader } from "./base";

export type TableDataLoaderFactory = (
  dataSource: TableDataSource,
  projectDir: FileSystemDirectoryHandle | null,
) => TableDataLoader<TableData>;

export interface TableDataLoader<TTableData extends TableData>
  extends DataLoader {
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
