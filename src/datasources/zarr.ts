import {
  PixelsDataSourceModelBase,
  TableDataSourceModelBase,
} from "../models/base";
import { ImageDataSourceModel } from "../models/image";
import { LabelsDataSourceModel } from "../models/labels";
import { PointsDataSourceModel } from "../models/points";
import {
  ImageDataSourceBase,
  LabelsDataSourceBase,
  PixelsDataSourceBase,
  PointsDataSourceBase,
  TableDataSourceBase,
  TileSourceSpec,
  TypedArray,
} from "./base";

abstract class ZarrDataSourceBase<
    TConfig extends PixelsDataSourceModelBase<string> &
      TableDataSourceModelBase<string>,
  >
  implements PixelsDataSourceBase<TConfig>, TableDataSourceBase<TConfig>
{
  private config: TConfig;

  constructor(config: TConfig) {
    this.config = config;
  }

  getConfig(): TConfig {
    return this.config;
  }

  getColumns(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _values: boolean = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _groups: boolean = false,
  ): string[] {
    throw new Error("Method not implemented."); // TODO
  }

  loadColumn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _col: string,
  ): Promise<TypedArray> {
    throw new Error("Method not implemented."); // TODO
  }
}

export const ZARR_IMAGE_DATA_SOURCE = "zarr";

export class ZarrImageDataSource
  extends ZarrDataSourceBase<ZarrImageDataSourceModel>
  implements ImageDataSourceBase<ZarrImageDataSourceModel>
{
  getImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ZarrImageDataSourceModel
  extends ImageDataSourceModel<typeof ZARR_IMAGE_DATA_SOURCE> {}

export const ZARR_LABELS_DATA_SOURCE = "zarr";

export class ZarrLabelsDataSource
  extends ZarrDataSourceBase<ZarrLabelsDataSourceModel>
  implements LabelsDataSourceBase<ZarrLabelsDataSourceModel>
{
  async loadLabelIDs(): Promise<TypedArray> {
    return await this.loadColumn(this.getConfig().labelIDsCol);
  }

  getLabelImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

export interface ZarrLabelsDataSourceModel
  extends LabelsDataSourceModel<typeof ZARR_LABELS_DATA_SOURCE> {
  labelIDsCol: string;
}

export const ZARR_POINTS_DATA_SOURCE = "zarr";

export class ZarrPointsDataSource
  extends ZarrDataSourceBase<ZarrPointsDataSourceModel>
  implements PointsDataSourceBase<ZarrPointsDataSourceModel>
{
  async loadPointIDs(): Promise<TypedArray> {
    return await this.loadColumn(this.getConfig().pointIDsCol);
  }

  async loadPointPositions(
    xValuesCol?: string,
    yValuesCol?: string,
  ): Promise<[TypedArray, TypedArray]> {
    const px = this.loadColumn(
      xValuesCol ?? this.getConfig().defaultXValuesCol ?? "x",
    );
    const py = this.loadColumn(
      yValuesCol ?? this.getConfig().defaultYValuesCol ?? "y",
    );
    return await Promise.all([px, py]);
  }
}

export interface ZarrPointsDataSourceModel
  extends PointsDataSourceModel<typeof ZARR_POINTS_DATA_SOURCE> {
  pointIDsCol: string;
  defaultXValuesCol?: string;
  defaultYValuesCol?: string;
}
