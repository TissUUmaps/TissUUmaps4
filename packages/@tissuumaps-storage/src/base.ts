import {
  type DataSource,
  type DataStorage,
  type ImageData,
  type ImageDataSource,
  type ImageDataStorage,
  type LabelsData,
  type LabelsDataSource,
  type LabelsDataStorage,
  type PointsData,
  type PointsDataSource,
  type PointsDataStorage,
  type ShapesData,
  type ShapesDataSource,
  type ShapesDataStorage,
  type TableData,
  type TableDataSource,
  type TableDataStorage,
} from "@tissuumaps/core";

export abstract class AbstractDataStorage<
  TDataSource extends DataSource,
> implements DataStorage {
  protected readonly dataSource: TDataSource;
  protected readonly workspace: FileSystemDirectoryHandle | null;

  constructor(
    dataSource: TDataSource,
    workspace: FileSystemDirectoryHandle | null,
  ) {
    this.dataSource = dataSource;
    this.workspace = workspace;
  }
}

export abstract class AbstractImageDataStorage<
  TImageDataSource extends ImageDataSource,
  TImageData extends ImageData,
>
  extends AbstractDataStorage<TImageDataSource>
  implements ImageDataStorage<TImageData>
{
  abstract loadImage(options?: { signal?: AbortSignal }): Promise<TImageData>;
}

export abstract class AbstractLabelsDataStorage<
  TLabelsDataSource extends LabelsDataSource,
  TLabelsData extends LabelsData,
>
  extends AbstractDataStorage<TLabelsDataSource>
  implements LabelsDataStorage<TLabelsData>
{
  abstract loadLabels(options?: { signal?: AbortSignal }): Promise<TLabelsData>;
}

export abstract class AbstractPointsDataStorage<
  TPointsDataSource extends PointsDataSource,
  TPointsData extends PointsData,
>
  extends AbstractDataStorage<TPointsDataSource>
  implements PointsDataStorage<TPointsData>
{
  abstract loadPoints(options?: { signal?: AbortSignal }): Promise<TPointsData>;
}

export abstract class AbstractShapesDataStorage<
  TShapesDataSource extends ShapesDataSource,
  TShapesData extends ShapesData,
>
  extends AbstractDataStorage<TShapesDataSource>
  implements ShapesDataStorage<TShapesData>
{
  abstract loadShapes(options?: { signal?: AbortSignal }): Promise<TShapesData>;
}

export abstract class AbstractTableDataStorage<
  TTableDataSource extends TableDataSource,
  TTableData extends TableData,
>
  extends AbstractDataStorage<TTableDataSource>
  implements TableDataStorage<TTableData>
{
  abstract loadTable(options?: { signal?: AbortSignal }): Promise<TTableData>;
}
