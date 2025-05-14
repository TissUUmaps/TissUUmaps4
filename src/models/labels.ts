import {
  DataDataSourceModel,
  DataGroupSettingsModel,
  GroupableDataModel,
  StaticDataLayerConfigModel,
} from "./base";
import { Color, GroupsColumn, ValuesColumn } from "./types";

/** A 2D labels mask */
export interface LabelsModel
  extends GroupableDataModel<
    LabelsDataSourceModel<string>,
    LabelsLayerConfigModel,
    LabelsGroupSettingsModel
  > {
  /** Color for all labels, or column containing label-wise colors/group names (defaults to random) */
  labelColor?: Color | ValuesColumn | GroupsColumn;

  /** Visibility for all labels, or column containing label-wise visibilities/group names (defaults to true) */
  labelVisibility?: boolean | ValuesColumn | GroupsColumn;

  /** Opacity for all labels, between 0 and 1, or column containing label-wise opacities/group names (defaults to 1) */
  labelOpacity?: number | ValuesColumn | GroupsColumn;
}

/** A data source for 2D labels masks */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LabelsDataSourceModel<T extends string>
  extends DataDataSourceModel<T> {}

/** A layer-specific display configuration for 2D labels masks */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LabelsLayerConfigModel extends StaticDataLayerConfigModel {}

/** A group-specific display configuration for 2D labels masks */
export interface LabelsGroupSettingsModel extends DataGroupSettingsModel {
  /** Label color, or undefined if not specified for this group */
  labelColor?: Color;

  /** Label visibility, or undefined if not specified for this group */
  labelVisibility?: boolean;

  /** Label opacity, between 0 and 1, or undefined if not specified for this group */
  labelOpacity?: number;
}
