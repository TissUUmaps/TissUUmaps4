import { RawTableDataSource } from "../models/table";
import { MappableArrayLike } from "../types";
import { Data, DataLoader } from "./base";

export interface TableData extends Data {
  getLength(): number;
  getColumns(): string[];
  loadColumn<T>(
    column: string,
    signal?: AbortSignal,
  ): Promise<MappableArrayLike<T>>;
}

export interface TableDataLoader<TTableData extends TableData>
  extends DataLoader {
  loadTable(signal?: AbortSignal): Promise<TTableData>;
}

export type TableDataLoaderFactory = (
  dataSource: RawTableDataSource,
  projectDir: FileSystemDirectoryHandle | null,
) => TableDataLoader<TableData>;
