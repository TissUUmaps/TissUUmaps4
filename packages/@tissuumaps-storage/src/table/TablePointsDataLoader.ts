import { type PointsData, type TableData } from "@tissuumaps/core";

import { AbstractPointsDataLoader } from "../base";
import { TablePointsData } from "./TablePointsData";
import { type TablePointsDataSource } from "./TablePointsDataSource";

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  TablePointsDataSource,
  PointsData
> {
  private readonly _loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;

  constructor(
    dataSource: TablePointsDataSource,
    projectDir: FileSystemDirectoryHandle | null,
    loadTableByID: typeof TablePointsDataLoader.prototype._loadTableByID,
  ) {
    super(dataSource, projectDir);
    this._loadTableByID = loadTableByID;
  }

  async loadPoints({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<PointsData> {
    signal?.throwIfAborted();
    const tableData = await this._loadTableByID(this.dataSource.tableId, {
      signal,
    });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}
