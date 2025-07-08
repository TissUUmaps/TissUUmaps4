import {
  IDataSourceModel,
  ILayerConfigModel,
  IObjectDataModel,
  IObjectGroupSettingsModel,
} from "./base";
import { Color, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D shape cloud */
export interface IShapesModel
  extends IObjectDataModel<
    IShapesDataSourceModel<string>,
    IShapesLayerConfigModel,
    IShapesGroupSettingsModel
  > {
  /** Color for all shapes, or a column containing shape-wise colors/group names (defaults to random) */
  shapeColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Visibility for all shapes, or a column containing shape-wise visibilities/group names (defaults to true) */
  shapeVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Opacity for all shapes, between 0 and 1, or a column containing shape-wise opacities/group names (defaults to 1) */
  shapeOpacity?: number | TableValuesColumn | TableGroupsColumn;
}

/** A data source for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IShapesDataSourceModel<TType extends string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IShapesLayerConfigModel extends ILayerConfigModel {}

/** A group-specific display configuration for 2D shape clouds */
export interface IShapesGroupSettingsModel extends IObjectGroupSettingsModel {
  /** Shape color, or undefined if not specified for this group */
  shapeColor?: Color;

  /** Shape visibility, or undefined if not specified for this group */
  shapeVisibility?: boolean;

  /** Shape opacity, between 0 and 1, or undefined if not specified for this group */
  shapeOpacity?: number;
}
