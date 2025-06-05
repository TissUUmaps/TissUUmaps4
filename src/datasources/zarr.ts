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

abstract class ZarrSource<
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

export const ZARR_IMAGE_SOURCE = "zarr-image";

export class ZarrImageSource
  extends ZarrSource<ZarrImageSourceModel>
  implements ImageSourceBase<ZarrImageSourceModel>
{
  getImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ZarrImageSourceModel
  extends ImageSourceModel<typeof ZARR_IMAGE_SOURCE> {}

export const ZARR_LABELS_SOURCE = "zarr-labels";

export class ZarrLabelsSource
  extends ZarrSource<ZarrLabelsSourceModel>
  implements LabelsSourceBase<ZarrLabelsSourceModel>
{
  async loadLabelIDs(): Promise<TypedArray> {
    return await this.loadColumn(this.getConfig().labelIDsCol);
  }

  getLabelImage(): TileSourceSpec {
    throw new Error("Method not implemented."); // TODO
  }
}

export interface ZarrLabelsSourceModel
  extends LabelsSourceModel<typeof ZARR_LABELS_SOURCE> {
  labelIDsCol: string;
}

export const ZARR_POINTS_SOURCE = "zarr-points";

export class ZarrPointsSource
  extends ZarrSource<ZarrPointsSourceModel>
  implements PointsSourceBase<ZarrPointsSourceModel>
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

export interface ZarrPointsSourceModel
  extends PointsSourceModel<typeof ZARR_POINTS_SOURCE> {
  pointIDsCol: string;
  defaultXValuesCol?: string;
  defaultYValuesCol?: string;
}
