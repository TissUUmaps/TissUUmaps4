import {
  type DataLoader,
  type DataSource,
  type ImageData,
  type ImageDataLoader,
  type ImageDataSource,
  type LabelsData,
  type LabelsDataLoader,
  type LabelsDataSource,
  type PointsData,
  type PointsDataLoader,
  type PointsDataSource,
  type ShapesData,
  type ShapesDataLoader,
  type ShapesDataSource,
  type TableData,
  type TableDataLoader,
  type TableDataSource,
} from "@tissuumaps/core";

export abstract class AbstractDataLoader<
  TDataSource extends DataSource,
> implements DataLoader {
  protected readonly dataSource: TDataSource;
  protected readonly workspace: FileSystemDirectoryHandle | null;

  constructor(
    dataSource: TDataSource,
    projectDir: FileSystemDirectoryHandle | null,
  ) {
    this.dataSource = dataSource;
    this.workspace = projectDir;
  }
}

export abstract class AbstractImageDataLoader<
  TImageDataSource extends ImageDataSource,
  TImageData extends ImageData,
>
  extends AbstractDataLoader<TImageDataSource>
  implements ImageDataLoader<TImageData>
{
  abstract loadImage(options: { signal?: AbortSignal }): Promise<TImageData>;
}

export abstract class AbstractLabelsDataLoader<
  TLabelsDataSource extends LabelsDataSource,
  TLabelsData extends LabelsData,
>
  extends AbstractDataLoader<TLabelsDataSource>
  implements LabelsDataLoader<TLabelsData>
{
  abstract loadLabels(options: { signal?: AbortSignal }): Promise<TLabelsData>;
}

export abstract class AbstractPointsDataLoader<
  TPointsDataSource extends PointsDataSource,
  TPointsData extends PointsData,
>
  extends AbstractDataLoader<TPointsDataSource>
  implements PointsDataLoader<TPointsData>
{
  abstract loadPoints(options: { signal?: AbortSignal }): Promise<TPointsData>;
}

export abstract class AbstractShapesDataLoader<
  TShapesDataSource extends ShapesDataSource,
  TShapesData extends ShapesData,
>
  extends AbstractDataLoader<TShapesDataSource>
  implements ShapesDataLoader<TShapesData>
{
  abstract loadShapes(options: { signal?: AbortSignal }): Promise<TShapesData>;
}

export abstract class AbstractTableDataLoader<
  TTableDataSource extends TableDataSource,
  TTableData extends TableData,
>
  extends AbstractDataLoader<TTableDataSource>
  implements TableDataLoader<TTableData>
{
  abstract loadTable(options: { signal?: AbortSignal }): Promise<TTableData>;
}
