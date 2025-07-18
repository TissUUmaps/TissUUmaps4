import { IDataSourceModel } from "../../models/base";
import { IImageDataSourceModel } from "../../models/image";
import { ILabelsDataSourceModel } from "../../models/labels";
import { IPointsDataSourceModel } from "../../models/points";
import { IShapesDataSourceModel } from "../../models/shapes";
import { ITableDataSourceModel } from "../../models/table";
import { IDataLoader } from "../base";
import { IImageData, IImageDataLoader } from "../image";
import { ILabelsData, ILabelsDataLoader } from "../labels";
import { IPointsData, IPointsDataLoader } from "../points";
import { IShapesData, IShapesDataLoader } from "../shapes";
import { ITableData, ITableDataLoader } from "../table";

export abstract class DataLoaderBase<TDataSourceModel extends IDataSourceModel>
  implements IDataLoader
{
  protected readonly dataSource: TDataSourceModel;
  protected readonly workspace: FileSystemDirectoryHandle | null;

  constructor(
    dataSource: TDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
  ) {
    this.dataSource = dataSource;
    this.workspace = projectDir;
  }
}

export abstract class ImageDataLoaderBase<
    TImageDataSourceModel extends IImageDataSourceModel,
    TImageData extends IImageData,
  >
  extends DataLoaderBase<TImageDataSourceModel>
  implements IImageDataLoader<TImageData>
{
  abstract loadImage(abortSignal?: AbortSignal): Promise<TImageData>;
}

export abstract class LabelsDataLoaderBase<
    TLabelsDataSourceModel extends ILabelsDataSourceModel,
    TLabelsData extends ILabelsData,
  >
  extends DataLoaderBase<TLabelsDataSourceModel>
  implements ILabelsDataLoader<TLabelsData>
{
  abstract loadLabels(abortSignal?: AbortSignal): Promise<TLabelsData>;
}

export abstract class PointsDataLoaderBase<
    TPointsDataSourceModel extends IPointsDataSourceModel,
    TPointsData extends IPointsData,
  >
  extends DataLoaderBase<TPointsDataSourceModel>
  implements IPointsDataLoader<TPointsData>
{
  abstract loadPoints(): Promise<TPointsData>;
}

export abstract class ShapesDataLoaderBase<
    TShapesDataSourceModel extends IShapesDataSourceModel,
    TShapesData extends IShapesData,
  >
  extends DataLoaderBase<TShapesDataSourceModel>
  implements IShapesDataLoader<TShapesData>
{
  abstract loadShapes(): Promise<TShapesData>;
}

export abstract class TableDataLoaderBase<
    TTableDataSourceModel extends ITableDataSourceModel,
    TTableData extends ITableData,
  >
  extends DataLoaderBase<TTableDataSourceModel>
  implements ITableDataLoader<TTableData>
{
  abstract loadTable(): Promise<TTableData>;
}
