import { DataSource } from "../../model/base";
import { ImageDataSource } from "../../model/image";
import { LabelsDataSource } from "../../model/labels";
import { PointsDataSource } from "../../model/points";
import { ShapesDataSource } from "../../model/shapes";
import { CompleteTableDataSource } from "../../model/table";
import { DataLoader } from "../base";
import { ImageData, ImageDataLoader } from "../image";
import { LabelsData, LabelsDataLoader } from "../labels";
import { PointsData, PointsDataLoader } from "../points";
import { ShapesData, ShapesDataLoader } from "../shapes";
import { TableData, TableDataLoader } from "../table";

export abstract class AbstractDataLoader<TDataSource extends DataSource>
  implements DataLoader
{
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
  abstract loadImage(signal?: AbortSignal): Promise<TImageData>;
}

export abstract class AbstractLabelsDataLoader<
    TLabelsDataSource extends LabelsDataSource,
    TLabelsData extends LabelsData,
  >
  extends AbstractDataLoader<TLabelsDataSource>
  implements LabelsDataLoader<TLabelsData>
{
  abstract loadLabels(signal?: AbortSignal): Promise<TLabelsData>;
}

export abstract class AbstractPointsDataLoader<
    TPointsDataSource extends PointsDataSource,
    TPointsData extends PointsData,
  >
  extends AbstractDataLoader<TPointsDataSource>
  implements PointsDataLoader<TPointsData>
{
  abstract loadPoints(signal?: AbortSignal): Promise<TPointsData>;
}

export abstract class AbstractShapesDataLoader<
    TShapesDataSource extends ShapesDataSource,
    TShapesData extends ShapesData,
  >
  extends AbstractDataLoader<TShapesDataSource>
  implements ShapesDataLoader<TShapesData>
{
  abstract loadShapes(signal?: AbortSignal): Promise<TShapesData>;
}

export abstract class AbstractTableDataLoader<
    TTableDataSource extends CompleteTableDataSource,
    TTableData extends TableData,
  >
  extends AbstractDataLoader<TTableDataSource>
  implements TableDataLoader<TTableData>
{
  abstract loadTable(signal?: AbortSignal): Promise<TTableData>;
}
