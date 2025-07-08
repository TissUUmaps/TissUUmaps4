import { IPointsDataSourceModel } from "../../models/points";
import { IPointsData } from "../points";
import { ITableData } from "../table";
import { TypedArray } from "../types";
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

  async loadCoordinates(dimension: string): Promise<TypedArray> {
    const coords = await this._tableData.loadColumnData(dimension);
    return Float32Array.from(coords);
  }

  destroy(): void {}
}

export class TablePointsDataLoader extends PointsDataLoaderBase<
  ITablePointsDataSourceModel,
  IPointsData
> {
  loadPoints(): Promise<IPointsData> {
    const pointsData = new TablePointsData(
      this.getTableData(this.dataSource.tableId),
      this.dataSource.columns ?? null,
    );
    return Promise.resolve(pointsData);
  }
}
