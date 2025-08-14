import {
  IDataSourceModel,
  ILayerConfigModel,
  IRenderedDataModel,
} from "./base";
import { Color, TableGroupsColumn, TableValuesColumn } from "./types";

/** A 2D shape cloud */
export interface IShapesModel
  extends IRenderedDataModel<IShapesDataSourceModel, IShapesLayerConfigModel> {
  /** Color for all shapes, or a column containing shape-wise colors/group names (defaults to random) */
  shapeColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Global color map ID or custom color map */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all shapes, or a column containing shape-wise visibilities/group names (defaults to true) */
  shapeVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all shapes, between 0 and 1, or a column containing shape-wise opacities/group names (defaults to 1) */
  shapeOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
}

/** A data source for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IShapesDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IShapesLayerConfigModel extends ILayerConfigModel {}
