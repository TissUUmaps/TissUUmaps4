import {
  type PointsData,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import { AbstractPointsDataLoader } from "../base";
import { TablePointsData } from "./TablePointsData";
import { type TablePointsDataSource } from "./TablePointsDataSource";

type LoadTableFunction = (
  tableId: string,
  options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
) => Promise<TableData>;

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  TablePointsDataSource,
  PointsData
> {
  private readonly _loadTable: LoadTableFunction;

  constructor(
    dataSource: TablePointsDataSource,
    workspace: FileSystemDirectoryHandle | null,
    loadTable: LoadTableFunction,
  ) {
    super(dataSource, workspace);
    this._loadTable = loadTable;
  }

  async loadPoints(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<PointsData> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await this._loadTable(this.dataSource.table, {
      signal,
      onProgress,
    });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}
