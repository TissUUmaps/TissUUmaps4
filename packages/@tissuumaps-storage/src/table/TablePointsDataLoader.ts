import { type PointsData, type TableData } from "@tissuumaps/core";

import { AbstractPointsDataLoader } from "../base";
import { TablePointsData } from "./TablePointsData";
import { type TablePointsDataSource } from "./TablePointsDataSource";

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  TablePointsDataSource,
  PointsData
> {
  private readonly _loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;

  constructor(
    dataSource: TablePointsDataSource,
    projectDir: FileSystemDirectoryHandle | null,
    loadTable: typeof TablePointsDataLoader.prototype._loadTable,
  ) {
    super(dataSource, projectDir);
    this._loadTable = loadTable;
  }

  async loadPoints({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<PointsData> {
    signal?.throwIfAborted();
    const tableData = await this._loadTable(this.dataSource.tableId, {
      signal,
    });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}
