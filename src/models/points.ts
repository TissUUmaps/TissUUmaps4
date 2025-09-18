import {
  IDataSourceModel,
  ILayerConfigModel,
  IRenderedDataModel,
} from "./base";
import { Color, Marker, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D point cloud */
export interface IPointsModel
  extends IRenderedDataModel<IPointsDataSourceModel, IPointsLayerConfigModel> {
  /** Size for all points, or column containing point-wise sizes/group names (defaults to 1.0) */
  pointSize?: number | TableValuesColumn | TableGroupsColumn;

  /** Global size map ID or custom size map */
  sizeMap?: string | { [key: string]: number };

  /** Shape for all points, or column containing point-wise shapes/group names (defaults to "circle") */
  pointMarker?: Marker | TableValuesColumn | TableGroupsColumn;

  /** Global marker map ID or custom marker map */
  markerMap?: string | { [key: string]: Marker };

  /** Color for all points, or column containing point-wise colors/group names (defaults to black) */
  pointColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Global color map ID or custom color map */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all points, or column containing point-wise visibilities/group names (defaults to true) */
  pointVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all points, between 0.0 and 1.0, or column containing point-wise opacities/group names (defaults to 1.0) */
  pointOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
}

/** A data source for 2D point clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IPointsDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D point clouds */
export interface IPointsLayerConfigModel extends ILayerConfigModel {
  /** Dimension containing point-wise X coordinates */
  x: string;

  /** Dimension containing point-wise Y coordinates */
  y: string;
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
