import {
  IDataSourceModel,
  ILayerConfigModel,
  IObjectDataModel,
  IObjectGroupSettingsModel,
} from "./base";
import { Color, Shape, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D point cloud */
export interface IPointsModel
  extends IObjectDataModel<
    IPointsDataSourceModel,
    IPointsLayerConfigModel,
    IPointsGroupSettingsModel
  > {
  /** Size for all points, or column containing point-wise sizes/group names (defaults to 1) */
  pointSize?: number | TableValuesColumn | TableGroupsColumn;

  /** Shape for all points, or column containing point-wise shapes/group names (defaults to "circle") */
  pointShape?: Shape | TableValuesColumn | TableGroupsColumn;

  /** Color for all points, or column containing point-wise colors/group names (defaults to random) */
  pointColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Visibility for all points, or column containing point-wise visibilities/group names (defaults to true) */
  pointVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Opacity for all points, between 0 and 1, or column containing point-wise opacities/group names (defaults to 1) */
  pointOpacity?: number | TableValuesColumn | TableGroupsColumn;
}

/** A data source for 2D point clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IPointsDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D point clouds */
export interface IPointsLayerConfigModel extends ILayerConfigModel {
  /** Column containing point-wise X coordinates */
  pointPosX: TableValuesColumn;

  /** Column containing point-wise Y coordinates */
  pointPosY: TableValuesColumn;
}

/** A group-specific display configuration for 2D point clouds */
export interface IPointsGroupSettingsModel extends IObjectGroupSettingsModel {
  /** Point size, or undefined if not specified for this group */
  pointSize?: number;

  /** Point shape, or undefined if not specified for this group */
  pointShape?: Shape;

  /** Point color, or undefined if not specified for this group */
  pointColor?: Color;

  /** Point visibility, or undefined if not specified for this group */
  pointVisibility?: boolean;

  /** Point opacity, between 0 and 1, or undefined if not specified for this group */
  pointOpacity?: number;
}

// TODO points presets
// export type PointsPreset = {
//   name: string;
//   columns: string[];
//   setsSize: boolean;
//   setsShape: boolean;
//   setsColor: boolean;
//   setsVisibility: boolean;
//   setsOpacity: boolean;
//   targetLayerConfigId?: string;
// };
