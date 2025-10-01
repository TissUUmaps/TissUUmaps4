import {
  RawPointsDataSource,
  createPointsDataSource,
} from "../../model/points";
import { PointsData } from "../points";
import { TableData } from "../table";
import { AbstractPointsDataLoader } from "./base";

// TODO TableShapesDataLoader

export const TABLE_POINTS_DATA_SOURCE = "table";

export interface RawTablePointsDataSource
  extends RawPointsDataSource<typeof TABLE_POINTS_DATA_SOURCE> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  tableId: string;
  dimensionColumns?: string[];
}

type DefaultedTablePointsDataSourceKeys = keyof Omit<
  RawTablePointsDataSource,
  "type" | "url" | "path" | "tableId" | "dimensionColumns"
>;

export type TablePointsDataSource = Required<
  Pick<RawTablePointsDataSource, DefaultedTablePointsDataSourceKeys>
> &
  Omit<RawTablePointsDataSource, DefaultedTablePointsDataSourceKeys>;

export function createTablePointsDataSource(
  rawTablePointsDataSource: RawTablePointsDataSource,
): TablePointsDataSource {
  return {
    ...createPointsDataSource(rawTablePointsDataSource),
    ...rawTablePointsDataSource,
  };
}

export class TablePointsDataLoader extends AbstractPointsDataLoader<
  TablePointsDataSource,
  PointsData
> {
  private readonly _loadTableByID: (
    tableId: string,
    signal?: AbortSignal,
  ) => Promise<TableData>;

  constructor(
    dataSource: RawTablePointsDataSource,
    projectDir: FileSystemDirectoryHandle | null,
    loadTableByID: TablePointsDataLoader["_loadTableByID"],
  ) {
    super(dataSource, projectDir);
    this._loadTableByID = loadTableByID;
  }

  async loadPoints(signal?: AbortSignal): Promise<PointsData> {
    signal?.throwIfAborted();
    const tableData = await this._loadTableByID(
      this.dataSource.tableId,
      signal,
    );
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
    signal?: AbortSignal,
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    const coords = await this._tableData.loadColumn<number>(dimension, signal);
    signal?.throwIfAborted();
    return coords instanceof Float32Array ? coords : Float32Array.from(coords);
  }

  destroy(): void {}
}
