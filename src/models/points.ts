import {
  TableGroupSettingsModelBase,
  TableLayerConfigModelBase,
  TableModelBase,
  TableSourceModelBase,
} from "./base";
import { Color, GroupsColumn, Shape, ValuesColumn } from "./types";

/** A 2D point cloud */
export interface PointsModel
  extends TableModelBase<
    PointsSourceModel<string>,
    PointsLayerConfigModel,
    PointsGroupSettingsModel
  > {
  /** Size for all points, or column containing point-wise sizes/group names (defaults to 1) */
  pointSize?: number | ValuesColumn | GroupsColumn;

  /** Shape for all points, or column containing point-wise shapes/group names (defaults to "circle") */
  pointShape?: Shape | ValuesColumn | GroupsColumn;

  /** Color for all points, or column containing point-wise colors/group names (defaults to random) */
  pointColor?: Color | ValuesColumn | GroupsColumn;

  /** Visibility for all points, or column containing point-wise visibilities/group names (defaults to true) */
  pointVisibility?: boolean | ValuesColumn | GroupsColumn;

  /** Opacity for all points, between 0 and 1, or column containing point-wise opacities/group names (defaults to 1) */
  pointOpacity?: number | ValuesColumn | GroupsColumn;
}

/** A data source for 2D point clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PointsSourceModel<T extends string>
  extends TableSourceModelBase<T> {}

/** A layer-specific display configuration for 2D point clouds */
export interface PointsLayerConfigModel extends TableLayerConfigModelBase {
  /** Column containing point-wise X coordinates */
  pointPosX: ValuesColumn;

  /** Column containing point-wise Y coordinates */
  pointPosY: ValuesColumn;
}

/** A group-specific display configuration for 2D point clouds */
export interface PointsGroupSettingsModel extends TableGroupSettingsModelBase {
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
