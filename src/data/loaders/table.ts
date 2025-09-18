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
  columns?: string[];
}

export class TablePointsData implements IPointsData {
  private readonly _tableData: ITableData;
  private readonly _columns: string[] | null;

  constructor(tableData: ITableData, columns: string[] | null) {
    this._tableData = tableData;
    this._columns = columns;
  }

  getIds(): number[] {
    return this._tableData.getIds();
  }

  getDimensions(): string[] {
    return this._columns || this._tableData.getColumns();
  }

  async loadPositions(
    xDimension: string,
    yDimension: string,
  ): Promise<[Float32Array, Float32Array]> {
    const px = this._tableData.loadColumn<number>(xDimension);
    const py = this._tableData.loadColumn<number>(yDimension);
    const [xs, ys] = await Promise.all([px, py]);
    return [
      xs instanceof Float32Array ? xs : Float32Array.from(xs),
      ys instanceof Float32Array ? ys : Float32Array.from(ys),
    ];
  }

  destroy(): void {}
}

export class TablePointsDataLoader extends PointsDataLoaderBase<
  ITablePointsDataSourceModel,
  IPointsData
> {
  private readonly _loadTableByID: (tableId: string) => Promise<ITableData>;

  constructor(
    dataSource: ITablePointsDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
    loadTableByID: (tableId: string) => Promise<ITableData>,
  ) {
    super(dataSource, projectDir);
    this._loadTableByID = loadTableByID;
  }

  async loadPoints(): Promise<IPointsData> {
    return new TablePointsData(
      await this._loadTableByID(this.dataSource.tableId),
      this.dataSource.columns ?? null,
    );
  }
}
