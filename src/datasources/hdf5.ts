import { PixelsSourceModelBase, TableSourceModelBase } from "../models/base";
import { ImageSourceModel } from "../models/image";
import { LabelsSourceModel } from "../models/labels";
import { PointsSourceModel } from "../models/points";
import {
  ImageSourceBase,
  LabelsSourceBase,
  PixelsSourceBase,
  PointsSourceBase,
  TableSourceBase,
  TileSourceSpec,
  TypedArray,
} from "./base";

abstract class HDF5Source<
    TConfig extends PixelsSourceModelBase<string> &
      TableSourceModelBase<string>,
  >
  implements PixelsSourceBase<TConfig>, TableSourceBase<TConfig>
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

export const HDF5_IMAGE_SOURCE = "hdf5-image";

export class HDF5ImageSource
  extends HDF5Source<HDF5ImageSourceModel>
  implements ImageSourceBase<HDF5ImageSourceModel>
{
  getImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HDF5ImageSourceModel
  extends ImageSourceModel<typeof HDF5_IMAGE_SOURCE> {}

export const HDF5_LABELS_SOURCE = "hdf5-labels";

export class HDF5LabelsSource
  extends HDF5Source<HDF5LabelsSourceModel>
  implements LabelsSourceBase<HDF5LabelsSourceModel>
{
  async loadLabelIDs(): Promise<TypedArray> {
    return await this.loadColumn(this.getConfig().labelIDsCol);
  }

  getLabelImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

export interface HDF5LabelsSourceModel
  extends LabelsSourceModel<typeof HDF5_LABELS_SOURCE> {
  labelIDsCol: string;
}

export const HDF5_POINTS_SOURCE = "hdf5-points";

export class HDF5PointsSource
  extends HDF5Source<HDF5PointsSourceModel>
  implements PointsSourceBase<HDF5PointsSourceModel>
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

export interface HDF5PointsSourceModel
  extends PointsSourceModel<typeof HDF5_POINTS_SOURCE> {
  pointIDsCol: string;
  defaultXValuesCol?: string;
  defaultYValuesCol?: string;
}
