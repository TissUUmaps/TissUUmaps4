import {
  type PointsData,
  type PointsDataSource,
  type RawPointsDataSource,
  type TableData,
  createPointsDataSource,
} from "@tissuumaps/core";

import { AbstractPointsDataLoader } from "../base";

// TODO TableShapesDataLoader

export const tablePointsDataSourceType = "table";
export const tablePointsDataSourceDefaults = {};

export interface RawTablePointsDataSource extends RawPointsDataSource<
  typeof tablePointsDataSourceType
> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  tableId: string;
  dimensionColumns?: string[];
}

export type TablePointsDataSource = PointsDataSource<
  typeof tablePointsDataSourceType
> &
  Required<
    Pick<RawTablePointsDataSource, keyof typeof tablePointsDataSourceDefaults>
  > &
  Omit<
    RawTablePointsDataSource,
    | keyof PointsDataSource<typeof tablePointsDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof tablePointsDataSourceDefaults
  >;

export function createTablePointsDataSource(
  rawTablePointsDataSource: RawTablePointsDataSource,
): TablePointsDataSource {
  return {
    ...createPointsDataSource(rawTablePointsDataSource),
    ...tablePointsDataSourceDefaults,
    ...rawTablePointsDataSource,
  };
}

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
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    const coords = await this._tableData.loadColumn<number>(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    return coords instanceof Float32Array ? coords : Float32Array.from(coords);
  }

  destroy(): void {}
}
