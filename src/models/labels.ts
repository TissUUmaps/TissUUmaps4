import {
  IDataSourceModel,
  ILayerConfigModel,
  IRenderedDataModel,
} from "./base";
import { Color, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D labels mask */
export interface ILabelsModel
  extends IRenderedDataModel<ILabelsDataSourceModel, ILabelsLayerConfigModel> {
  /** Color for all labels, or column containing label-wise colors/group names (defaults to random) */
  labelColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Global color map ID or custom color map */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all labels, or column containing label-wise visibilities/group names (defaults to true) */
  labelVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all labels, between 0 and 1, or column containing label-wise opacities/group names (defaults to 1) */
  labelOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
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
