import { type PointsData, type TableData } from "@tissuumaps/core";

import { AbstractPointsDataLoader } from "../base";
import { TablePointsData } from "./TablePointsData";
import {
  type TablePointsDataSource,
  tablePointsDataSourceSchema,
  tablePointsDataSourceUISchema,
} from "./TablePointsDataSource";

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  TablePointsDataSource,
  PointsData
> {
  readonly dataSourceSchema = tablePointsDataSourceSchema;
  readonly dataSourceUISchema = tablePointsDataSourceUISchema;

  private readonly _loadTable: (
    tableId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<TableData>;

  constructor(
    dataSource: TablePointsDataSource,
    workspace: FileSystemDirectoryHandle | null,
    loadTable: typeof TablePointsDataLoader.prototype._loadTable,
  ) {
    super(dataSource, workspace);
    this._loadTable = loadTable;
  }

  async loadPoints(options?: { signal?: AbortSignal }): Promise<PointsData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await this._loadTable(this.dataSource.table, { signal });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}
