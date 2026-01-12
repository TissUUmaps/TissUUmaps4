import { colorPalettes } from "../palettes";
import { type Color } from "../types/color";
import { type TableGroupsRef, type TableValuesRef } from "../types/tableRef";
import { type ValueMap } from "../types/valueMap";
import {
  type DataSource,
  type LayerConfig,
  type RawDataSource,
  type RawLayerConfig,
  type RawRenderedDataObject,
  type RenderedDataObject,
  createDataSource,
  createLayerConfig,
  createRenderedDataObject,
} from "./base";

export const labelsDefaults = {
  labelColor: "randomFromPalette" as const,
  labelColorPalette: "batlowS",
  labelVisibility: true,
  labelOpacity: 1,
};

/**
 * A two-dimensional label mask
 */
export interface RawLabels extends RawRenderedDataObject<
  RawLabelsDataSource<string>,
  RawLabelsLayerConfig
> {
  /**
   * Label color
   *
   * Can be specified as:
   * - A single color to set the same color for all labels
   * - A table column holding continuous numerical values for each label; values are clipped to {@link labelColorRange}, which is linearly mapped to {@link labelColorPalette}
   * - A table column holding categorical group names for each label; group names are mapped to label colors using {@link labelColorMap}
   * - The special value "randomFromPalette" to assign each label a random color from {@link labelColorPalette}
   *
   * @defaultValue {@link labelsDefaults.labelColor}
   */
  labelColor?: Color | TableValuesRef | TableGroupsRef | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link labelColorPalette}
   *
   * Table values are clipped to this range before mapping them to label colors.
   *
   * Used when {@link labelColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., fall back to "minmax", emitting a warning when in use)
   */
  labelColorRange?: [number, number] | "minmax";

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be one of the predefined continuous or categorical color palettes in {@link colorPalettes}.
   *
   * Used when {@link labelColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link labelsDefaults.labelColorPalette}
   */
  labelColorPalette?: keyof typeof colorPalettes;

  /**
   * Label group-to-color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link labelColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link labelsDefaults.labelColor})
   */
  labelColorMap?: string | ValueMap<Color>;

  /**
   * Label visibility
   *
   * Can be specified as:
   * - A single boolean to set the same visibility for all labels
   * - A table column holding numerical values for each label; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each label; group names are mapped to label visibilities using {@link labelVisibilityMap}
   *
   * @defaultValue {@link labelsDefaults.labelVisibility}
   */
  labelVisibility?: boolean | TableValuesRef | TableGroupsRef;

  /**
   * Label group-to-visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link labelVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link labelsDefaults.labelVisibility})
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
   * Note that label opacities are also affected by {@link RawLabels.opacity} and {@link "./layer".RawLayer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link labelsDefaults.labelOpacity}
   */
  labelOpacity?: number | TableValuesRef | TableGroupsRef;

  /**
   * Label group-to-opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link labelOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link labelsDefaults.labelOpacity})
   */
  labelOpacityMap?: string | ValueMap<number>;
}

/**
 * A {@link RawLabels} with default values applied
 */
export type Labels = RenderedDataObject<
  LabelsDataSource<string>,
  LabelsLayerConfig
> &
  Required<Pick<RawLabels, keyof typeof labelsDefaults>> &
  Omit<
    RawLabels,
    | keyof RenderedDataObject<LabelsDataSource<string>, LabelsLayerConfig>
    | keyof typeof labelsDefaults
  >;

/**
 * Creates a {@link Labels} from a {@link RawLabels} by applying default values
 *
 * @param rawLabels - The raw labels
 * @returns The complete labels with default values applied
 */
export function createLabels(rawLabels: RawLabels): Labels {
  return {
    ...createRenderedDataObject(rawLabels),
    ...labelsDefaults,
    ...rawLabels,
    dataSource: createLabelsDataSource(rawLabels.dataSource),
    layerConfigs: rawLabels.layerConfigs?.map(createLabelsLayerConfig) ?? [],
  };
}

export const labelsDataSourceDefaults = {};

/**
 * A data source for two-dimensional label masks
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawLabelsDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawLabelsDataSource} with default values applied
 */
export type LabelsDataSource<TType extends string = string> =
  DataSource<TType> &
    Required<
      Pick<RawLabelsDataSource<TType>, keyof typeof labelsDataSourceDefaults>
    > &
    Omit<
      RawLabelsDataSource<TType>,
      | keyof DataSource<TType>
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      | keyof typeof labelsDataSourceDefaults
    >;

/**
 * Creates a {@link LabelsDataSource} from a {@link RawLabelsDataSource} by applying default values
 *
 * @param rawLabelsDataSource - The raw labels data source
 * @returns The complete labels data source with default values applied
 */
export function createLabelsDataSource<TType extends string>(
  rawLabelsDataSource: RawLabelsDataSource<TType>,
): LabelsDataSource<TType> {
  return {
    ...createDataSource(rawLabelsDataSource),
    ...labelsDataSourceDefaults,
    ...rawLabelsDataSource,
  };
}

export const labelsLayerConfigDefaults = {};

/**
 * A layer-specific display configuration for two-dimensional label masks
 */
export interface RawLabelsLayerConfig extends RawLayerConfig {
  /**
   * Layer ID
   */
  layerId: string;
}

/**
 * A {@link RawLabelsLayerConfig} with default values applied
 */
export type LabelsLayerConfig = LayerConfig &
  Required<Pick<RawLabelsLayerConfig, keyof typeof labelsLayerConfigDefaults>> &
  Omit<
    RawLabelsLayerConfig,
    | keyof LayerConfig
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof labelsLayerConfigDefaults
  >;

/**
 * Creates a {@link LabelsLayerConfig} from a {@link RawLabelsLayerConfig} by applying default values
 *
 * @param rawLabelsLayerConfig - The raw labels layer configuration
 * @returns The complete labels layer configuration with default values applied
 */
export function createLabelsLayerConfig(
  rawLabelsLayerConfig: RawLabelsLayerConfig,
): LabelsLayerConfig {
  return {
    ...createLayerConfig(rawLabelsLayerConfig),
    ...labelsLayerConfigDefaults,
    ...rawLabelsLayerConfig,
  };
}
