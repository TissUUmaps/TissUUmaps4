import { IPointsDataSourceModel } from "../../models/points";
import { IPointsData } from "../points";
import { ITableData } from "../table";
import { PointsDataLoaderBase } from "./base";

// TODO TableShapesDataLoader

export const TABLE_POINTS_DATA_SOURCE = "table";

export interface ITablePointsDataSourceModel
  extends IPointsDataSourceModel<typeof TABLE_POINTS_DATA_SOURCE> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  tableId: string;
  dimensionColumns?: string[];
}

export class TablePointsData implements IPointsData {
  private readonly _tableData: ITableData;
  private readonly _dimensionColumns: string[] | null;

  constructor(tableData: ITableData, dimensionColumns: string[] | null) {
    this._tableData = tableData;
    this._dimensionColumns = dimensionColumns;
  }

  getLength(): number {
    return this._tableData.getLength();
  }

  getDimensions(): string[] {
    return this._dimensionColumns || this._tableData.getColumns();
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

export class TablePointsDataLoader extends PointsDataLoaderBase<
  ITablePointsDataSourceModel,
  IPointsData
> {
  private readonly _loadTableByID: (
    tableId: string,
    signal?: AbortSignal,
  ) => Promise<ITableData>;

  constructor(
    dataSource: ITablePointsDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
  ) {
    super(dataSource, projectDir);
    this._loadTableByID = loadTableByID;
  }

  async loadPoints(signal?: AbortSignal): Promise<IPointsData> {
    signal?.throwIfAborted();
    const tableData = await this._loadTableByID(
      this.dataSource.tableId,
      signal,
    );
    signal?.throwIfAborted();
    return new TablePointsData(
      tableData,
      this.dataSource.dimensionColumns ?? null,
    );
  }
}
