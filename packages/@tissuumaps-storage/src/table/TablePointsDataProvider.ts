import {
  type PointsDataProvider,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import { TablePointsData } from "./TablePointsData";
import {
  type TablePointsDataSource,
  createDefaultTablePointsDataSource,
} from "./TablePointsDataSource";

export type LoadTableFunction = (
  tableId: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  },
) => Promise<TableData>;

export class TablePointsDataProvider implements PointsDataProvider<
  TablePointsDataSource,
  TablePointsData
> {
  readonly name = "Table";

  readonly schema = {
    type: "object",
    properties: {
      table: {
        type: "string",
      },
    },
    required: ["table"],
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
    ],
  };

  private readonly _loadTable: LoadTableFunction;

  constructor(loadTable: LoadTableFunction) {
    this._loadTable = loadTable;
  }

  async open(
    dataSource: TablePointsDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace: FileSystemDirectoryHandle | null;
    },
  ): Promise<TablePointsData> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();

    const defaultDataSource = createDefaultTablePointsDataSource(dataSource);

    const tableData = await this._loadTable(defaultDataSource.table, {
      signal,
      onProgress,
    });
    signal?.throwIfAborted();

    return new TablePointsData(tableData, defaultDataSource.dimensionColumns);
  }
}
