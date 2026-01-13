import {
  type ColorConfig,
  type OpacityConfig,
  type VisibilityConfig,
} from "../types/config";
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
  labelColor: { random: { palette: "batlowS" } },
  labelVisibility: { value: true },
  labelOpacity: { value: 1 },
};

/**
 * A two-dimensional label mask
 */
export interface RawLabels extends RawRenderedDataObject<
  RawLabelsDataSource<string>,
  RawLabelsLayerConfig
> {
  labelColor?: ColorConfig;
  labelVisibility?: VisibilityConfig;
  labelOpacity?: OpacityConfig;
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
  layer: string;
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
