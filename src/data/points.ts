import { IPointsDataSourceModel } from "../models/points";
import { DataLoaderBase, IData, IDataLoader } from "./base";
import { ITableData } from "./table";
import { TypedArray } from "./types";

export interface IPointsData extends IData {
  getIds(): number[];
  getDimensions(): string[];
  loadCoordinates(dimension: string): Promise<TypedArray>;
}

export interface IPointsDataLoader<TPointsData extends IPointsData>
  extends IDataLoader {
  loadPoints(): Promise<TPointsData>;
}

export abstract class PointsDataLoaderBase<
    TPointsDataSourceModel extends IPointsDataSourceModel<string>,
    TPointsData extends IPointsData,
  >
  extends DataLoaderBase<TPointsDataSourceModel>
  implements IPointsDataLoader<TPointsData>
{
  protected readonly getTableData: (tableId: string) => ITableData;

  constructor(
    dataSource: TPointsDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
    getTableData: (tableId: string) => ITableData,
  ) {
    super(dataSource, projectDir);
    this.getTableData = getTableData;
  }

  abstract loadPoints(): Promise<TPointsData>;
}
