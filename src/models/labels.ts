import {
  IDataSourceModel,
  ILayerConfigModel,
  IObjectDataModel,
  IObjectGroupSettingsModel,
  IPixelDataModel,
} from "./base";
import { Color, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D labels mask */
export interface ILabelsModel
  extends IPixelDataModel<ILabelsDataSourceModel, ILabelsLayerConfigModel>,
    IObjectDataModel<
      ILabelsDataSourceModel,
      ILabelsLayerConfigModel,
      ILabelsGroupSettingsModel
    > {
  /** Color for all labels, or column containing label-wise colors/group names (defaults to random) */
  labelColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Visibility for all labels, or column containing label-wise visibilities/group names (defaults to true) */
  labelVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Opacity for all labels, between 0 and 1, or column containing label-wise opacities/group names (defaults to 1) */
  labelOpacity?: number | TableValuesColumn | TableGroupsColumn;
}

/** A data source for 2D labels masks */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ILabelsDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D labels masks */
export interface ILabelsLayerConfigModel extends ILayerConfigModel {
  /** Layer ID */
  layerId: string;
}

/** A group-specific display configuration for 2D labels masks */
export interface ILabelsGroupSettingsModel extends IObjectGroupSettingsModel {
  /** Label color, or undefined if not specified for this group */
  labelColor?: Color;

  /** Label visibility, or undefined if not specified for this group */
  labelVisibility?: boolean;

  /** Label opacity, between 0 and 1, or undefined if not specified for this group */
  labelOpacity?: number;
}
