import { IShapesDataSourceModel } from "../models/shapes";
import { DataLoaderBase, IData, IDataLoader } from "./base";
import { ITableData } from "./table";
import { GeoJSONGeometry } from "./types";

export interface IShapesData extends IData {
  getIds(): number[];
  loadGeometries(): Promise<GeoJSONGeometry[]>;
}

export interface IShapesDataLoader<TShapesData extends IShapesData>
  extends IDataLoader {
  loadShapes: () => Promise<TShapesData>;
}

export abstract class ShapesDataLoaderBase<
    TShapesDataSourceModel extends IShapesDataSourceModel<string>,
    TShapesData extends IShapesData,
  >
  extends DataLoaderBase<TShapesDataSourceModel>
  implements IShapesDataLoader<TShapesData>
{
  protected readonly getTableData: (tableId: string) => ITableData;

  constructor(
    dataSource: TShapesDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
    getTableData: (tableId: string) => ITableData,
  ) {
    super(dataSource, projectDir);
    this.getTableData = getTableData;
  }

  abstract loadShapes(): Promise<TShapesData>;
}
