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
  private readonly tableData: ITableData;
  private readonly columns: string[] | null;

  constructor(tableData: ITableData, columns: string[] | null) {
    this.tableData = tableData;
    this.columns = columns;
  }

  getIds(): number[] {
    return this.tableData.getIds();
  }

  getDimensions(): string[] {
    return this.columns || this.tableData.getColumns();
  }

  async loadCoordinates(dimension: string): Promise<TypedArray> {
    const coords = await this.tableData.loadColumnData(dimension);
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
