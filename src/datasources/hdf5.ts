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

abstract class HDF5DataSourceBase<
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

export const HDF5_IMAGE_DATA_SOURCE = "hdf5";

export class HDF5ImageDataSource
  extends HDF5DataSourceBase<HDF5ImageDataSourceModel>
  implements ImageDataSourceBase<HDF5ImageDataSourceModel>
{
  getImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HDF5ImageDataSourceModel
  extends ImageDataSourceModel<typeof HDF5_IMAGE_DATA_SOURCE> {}

export const HDF5_LABELS_DATA_SOURCE = "hdf5";

export class HDF5LabelsDataSource
  extends HDF5DataSourceBase<HDF5LabelsDataSourceModel>
  implements LabelsDataSourceBase<HDF5LabelsDataSourceModel>
{
  async loadLabelIDs(): Promise<TypedArray> {
    return await this.loadColumn(this.getConfig().labelIDsCol);
  }

  getLabelImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

export interface HDF5LabelsDataSourceModel
  extends LabelsDataSourceModel<typeof HDF5_LABELS_DATA_SOURCE> {
  labelIDsCol: string;
}

export const HDF5_POINTS_DATA_SOURCE = "hdf5";

export class HDF5PointsDataSource
  extends HDF5DataSourceBase<HDF5PointsDataSourceModel>
  implements PointsDataSourceBase<HDF5PointsDataSourceModel>
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

export interface HDF5PointsDataSourceModel
  extends PointsDataSourceModel<typeof HDF5_POINTS_DATA_SOURCE> {
  pointIDsCol: string;
  defaultXValuesCol?: string;
  defaultYValuesCol?: string;
}
