import {
  GroupSettingsModelBase,
  TableDataSourceModelBase,
  TableLayerConfigModelBase,
  TableModelBase,
} from "./base";
import { Color, GroupsColumn, ValuesColumn } from "./types";

/** A 2D shape cloud */
export interface ShapesModel
  extends TableModelBase<
    ShapesDataSourceModel<string>,
    ShapesLayerConfigModel,
    ShapesGroupSettingsModel
  > {
  /** Color for all shapes, or a column containing shape-wise colors/group names (defaults to random) */
  shapeColor?: Color | ValuesColumn | GroupsColumn;

  /** Visibility for all shapes, or a column containing shape-wise visibilities/group names (defaults to true) */
  shapeVisibility?: boolean | ValuesColumn | GroupsColumn;

  /** Opacity for all shapes, between 0 and 1, or a column containing shape-wise opacities/group names (defaults to 1) */
  shapeOpacity?: number | ValuesColumn | GroupsColumn;
}

/** A data source for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesDataSourceModel<T extends string>
  extends TableDataSourceModelBase<T> {}

/** A layer-specific display configuration for 2D shape clouds */
export interface ShapesLayerConfigModel extends TableLayerConfigModelBase {
  /** Column containing shape geometries (GeoJSON Geometry objects) */
  shapeGeometry: ValuesColumn;
}

/** A group-specific display configuration for 2D shape clouds */
export interface ShapesGroupSettingsModel extends GroupSettingsModelBase {
  /** Shape color, or undefined if not specified for this group */
  shapeColor?: Color;

  /** Shape visibility, or undefined if not specified for this group */
  shapeVisibility?: boolean;

  /** Shape opacity, between 0 and 1, or undefined if not specified for this group */
  shapeOpacity?: number;
}
