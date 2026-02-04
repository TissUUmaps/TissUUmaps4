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
  readonly schema = tablePointsDataSourceSchema;
  readonly uischema = tablePointsDataSourceUISchema;

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
    const tableData = await this._loadTable(this.dataSource.table, { signal });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}
