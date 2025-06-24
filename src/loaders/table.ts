import { IPointsData, IPointsDataLoader } from "../data/points";
import { ITableData } from "../data/table";
import { TypedArray } from "../data/types";
import { IPointsDataSourceModel } from "../models/points";

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
    return this.tableData.getIndex();
  }

  getDimensions(): string[] {
    return this.columns || this.tableData.getColumns();
  }

  async loadCoordinates(dimension: string): Promise<TypedArray> {
    const coords = await this.tableData.loadColumnData(dimension);
    return Float32Array.from(coords);
  }
}

export class TablePointsDataLoader
  implements IPointsDataLoader<ITablePointsDataSourceModel, IPointsData>
{
  private readonly dataSource: ITablePointsDataSourceModel;
  private readonly loadTable: (column: string) => Promise<ITableData>;

  constructor(
    dataSource: ITablePointsDataSourceModel,
    loadTable: (tableId: string) => Promise<ITableData>,
  ) {
    this.dataSource = dataSource;
    this.loadTable = loadTable;
  }

  getDataSource(): ITablePointsDataSourceModel {
    return this.dataSource;
  }

  getProjectDir(): FileSystemDirectoryHandle | undefined {
    return undefined;
  }

  async loadPoints(): Promise<IPointsData> {
    const tableData = await this.loadTable(this.dataSource.tableId);
    return new TablePointsData(tableData, this.dataSource.columns);
  }
}
