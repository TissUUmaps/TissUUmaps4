import { COLOR_PALETTES } from "../palettes";
import {
  Color,
  ColorMap,
  TableGroupsColumn,
  TableValuesColumn,
  ValueMap,
} from "../types";
import {
  DataSource,
  DataSourceKeysWithDefaults,
  LayerConfig,
  LayerConfigKeysWithDefaults,
  RenderedDataObject,
  RenderedDataObjectKeysWithDefaults,
  completeDataSource,
  completeLayerConfig,
  completeRenderedDataObject,
} from "./base";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Layer } from "./layer";

/** Default label color of {@link Labels} */
export const DEFAULT_LABEL_COLOR: Exclude<
  Labels["labelColor"],
  undefined | TableValuesColumn | TableGroupsColumn
> = "randomFromPalette";

/** Default label color palette of {@link Labels} */
export const DEFAULT_LABEL_COLOR_PALETTE: keyof typeof COLOR_PALETTES =
  "batlowS";

/** Default label visibility of {@link Labels} */
export const DEFAULT_LABEL_VISIBILITY: boolean = true;

/** Default label opacity of {@link Labels} */
export const DEFAULT_LABEL_OPACITY: number = 1;

/**
 * A two-dimensional label mask
 */
export interface Labels
  extends RenderedDataObject<LabelsDataSource, LabelsLayerConfig> {
  /**
   * Label color
   *
   * Can be specified as:
   * - A single color to set the same color for all labels
   * - A table column holding continuous numerical values for each label; values are clipped to {@link labelColorRange}, which is linearly mapped to {@link labelColorPalette}
   * - A table column holding categorical group names for each label; group names are mapped to label colors using {@link labelColorMap}
   * - The special value "randomFromPalette" to assign each label a random color from {@link labelColorPalette}
   *
   * @defaultValue {@link DEFAULT_LABEL_COLOR}
   */
  labelColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link labelColorPalette}
   *
   * Table values are clipped to this range before mapping them to label colors.
   *
   * Used when {@link labelColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., the range of values in the specified column is used)
   */
  labelColorRange?: [number, number];

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be one of the predefined continuous or categorical color palettes in {@link COLOR_PALETTES}.
   *
   * Used when {@link labelColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link DEFAULT_LABEL_COLOR_PALETTE}
   */
  labelColorPalette?: keyof typeof COLOR_PALETTES;

  /**
   * Label group-to-color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link labelColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_LABEL_COLOR})
   */
  labelColorMap?: string | ColorMap;

  /**
   * Label visibility
   *
   * Can be specified as:
   * - A single boolean to set the same visibility for all labels
   * - A table column holding numerical values for each label; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each label; group names are mapped to label visibilities using {@link labelVisibilityMap}
   *
   * @defaultValue {@link DEFAULT_LABEL_VISIBILITY}
   */
  labelVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /**
   * Label group-to-visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link labelVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_LABEL_VISIBILITY})
   */
  labelVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Label opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same opacity for all labels
   * - A table column holding numerical opacity values in the range [0, 1] for each label
   * - A table column holding categorical group names for each label; group names are mapped to opacities using {@link labelOpacityMap}
   *
   * Note that label opacities are also affected by {@link Labels.opacity} and {@link Layer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link DEFAULT_LABEL_OPACITY}
   */
  labelOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Label group-to-opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link labelOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_LABEL_OPACITY})
   */
  labelOpacityMap?: string | ValueMap<number>;
}

/**
 * {@link Labels} properties that have default values
 *
 * @internal
 */
export type LabelsKeysWithDefaults =
  | RenderedDataObjectKeysWithDefaults<LabelsDataSource, LabelsLayerConfig>
  | keyof Pick<
      Labels,
      "labelColor" | "labelColorPalette" | "labelVisibility" | "labelOpacity"
    >;

/**
 * A {@link Labels} with default values applied
 *
 * @internal
 */
export type CompleteLabels = Required<Pick<Labels, LabelsKeysWithDefaults>> &
  Omit<Labels, LabelsKeysWithDefaults>;

/**
 * Creates a {@link CompleteLabels} from a {@link Labels} by applying default values
 *
 * @param labels - The raw labels
 * @returns The complete labels with default values applied
 *
 * @internal
 */
export function completeLabels(labels: Labels): CompleteLabels {
  return {
    ...completeRenderedDataObject(labels),
    labelColor: DEFAULT_LABEL_COLOR,
    labelColorPalette: DEFAULT_LABEL_COLOR_PALETTE,
    labelVisibility: DEFAULT_LABEL_VISIBILITY,
    labelOpacity: DEFAULT_LABEL_OPACITY,
    ...labels,
  };
}

/**
 * A data source for two-dimensional label masks
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LabelsDataSource<TType extends string = string>
  extends DataSource<TType> {}

/**
 * {@link LabelsDataSource} properties that have default values
 *
 * @internal
 */
export type LabelsDataSourceKeysWithDefaults<TType extends string = string> =
  DataSourceKeysWithDefaults<TType>;

/**
 * A {@link LabelsDataSource} with default values applied
 *
 * @internal
 */
export type CompleteLabelsDataSource<TType extends string = string> = Required<
  Pick<LabelsDataSource<TType>, LabelsDataSourceKeysWithDefaults<TType>>
> &
  Omit<LabelsDataSource<TType>, LabelsDataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompleteLabelsDataSource} from a {@link LabelsDataSource} by applying default values
 *
 * @param labelsDataSource - The raw labels data source
 * @returns The complete labels data source with default values applied
 *
 * @internal
 */
export function completeLabelsDataSource<TType extends string = string>(
  labelsDataSource: LabelsDataSource<TType>,
): CompleteLabelsDataSource<TType> {
  return { ...completeDataSource(labelsDataSource), ...labelsDataSource };
}

/**
 * A layer-specific display configuration for two-dimensional label masks
 */
export interface LabelsLayerConfig extends LayerConfig {
  /**
   * Layer ID
   */
  layerId: string;
}

/**
 * {@link LabelsLayerConfig} properties that have default values
 *
 * @internal
 */
export type LabelsLayerConfigKeysWithDefaults = LayerConfigKeysWithDefaults;

/**
 * An {@link LabelsLayerConfig} with default values applied
 *
 * @internal
 */
export type CompleteLabelsLayerConfig = Required<
  Pick<LabelsLayerConfig, LabelsLayerConfigKeysWithDefaults>
> &
  Omit<LabelsLayerConfig, LabelsLayerConfigKeysWithDefaults>;

/**
 * Creates a {@link CompleteLabelsLayerConfig} from a {@link LabelsLayerConfig} by applying default values
 *
 * @param labelsLayerConfig - The raw labels layer configuration
 * @returns The complete labels layer configuration with default values applied
 *
 * @internal
 */
export function completeLabelsLayerConfig(
  labelsLayerConfig: LabelsLayerConfig,
): CompleteLabelsLayerConfig {
  return { ...completeLayerConfig(labelsLayerConfig), ...labelsLayerConfig };
}
