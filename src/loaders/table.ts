import { IPointsData, PointsDataLoaderBase } from "../data/points";
import { ITableData } from "../data/table";
import { TypedArray } from "../data/types";
import { IPointsDataSourceModel } from "../models/points";

// TODO TableShapesDataLoader

export const TABLE_POINTS_DATA_SOURCE = "table";

export interface ITablePointsDataSourceModel
  extends IPointsDataSourceModel<typeof TABLE_POINTS_DATA_SOURCE> {
  tableId: string;
  columns?: string[];
}

export class TablePointsData implements IPointsData {
  private readonly tableData: ITableData;
  private readonly columns?: string[];

  constructor(tableData: ITableData, columns?: string[]) {
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
}

export class TablePointsDataLoader extends PointsDataLoaderBase<
  ITablePointsDataSourceModel,
  IPointsData
> {
  loadPoints(): Promise<IPointsData> {
    const tableData = this.getTableData(this.dataSource.tableId);
    const pointsData = new TablePointsData(tableData, this.dataSource.columns);
    return Promise.resolve(pointsData);
  }
}
