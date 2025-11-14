import {
  PointsDataSource,
  PointsDataSourceKeysWithDefaults,
  completePointsDataSource,
} from "../../model/points";
import { PointsData } from "../points";
import { TableData } from "../table";
import { AbstractPointsDataLoader } from "./base";

// TODO TableShapesDataLoader

export const TABLE_POINTS_DATA_SOURCE = "table";

export interface TablePointsDataSource
  extends PointsDataSource<typeof TABLE_POINTS_DATA_SOURCE> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  tableId: string;
  dimensionColumns?: string[];
}

export type TablePointsDataSourceKeysWithDefaults =
  PointsDataSourceKeysWithDefaults<typeof TABLE_POINTS_DATA_SOURCE>;

export type CompleteTablePointsDataSource = Required<
  Pick<TablePointsDataSource, TablePointsDataSourceKeysWithDefaults>
> &
  Omit<TablePointsDataSource, TablePointsDataSourceKeysWithDefaults>;

export function completeTablePointsDataSource(
  tablePointsDataSource: TablePointsDataSource,
): CompleteTablePointsDataSource {
  return {
    ...completePointsDataSource(tablePointsDataSource),
    ...tablePointsDataSource,
  };
}

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  CompleteTablePointsDataSource,
  PointsData
> {
  private readonly _loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;

  constructor(
    dataSource: TablePointsDataSource,
    projectDir: FileSystemDirectoryHandle | null,
    loadTableByID: TablePointsDataLoader["_loadTableByID"],
  ) {
    super(dataSource, projectDir);
    this._loadTableByID = loadTableByID;
  }

  async loadPoints(
    options: { signal?: AbortSignal } = {},
  ): Promise<PointsData> {
    const { signal } = options;
    signal?.throwIfAborted();
    const tableData = await this._loadTableByID(this.dataSource.tableId, {
      signal,
    });
    signal?.throwIfAborted();
    return new TablePointsData(tableData, this.dataSource.dimensionColumns);
  }
}

export class TablePointsData implements PointsData {
  private readonly _tableData: TableData;
  private readonly _dimensionColumns?: string[];

  constructor(tableData: TableData, dimensionColumns?: string[]) {
    this._tableData = tableData;
    this._dimensionColumns = dimensionColumns;
  }

  getLength(): number {
    return this._tableData.getLength();
  }

  getDimensions(): string[] {
    return this._dimensionColumns ?? this._tableData.getColumns();
  }

  async loadCoordinates(
    dimension: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<Float32Array> {
    const { signal } = options;
    signal?.throwIfAborted();
    const coords = await this._tableData.loadColumn<number>(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    return coords instanceof Float32Array ? coords : Float32Array.from(coords);
  }

  destroy(): void {}
}
