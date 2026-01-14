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
import {
  type ColorConfig,
  type OpacityConfig,
  type VisibilityConfig,
} from "./configs";
import {
  defaultLabelOpacity,
  defaultLabelVisibility,
  defaultRandomLabelColorPalette,
} from "./constants";

/**
 * Default values for {@link RawLabels}
 */
export const labelsDefaults = {
  labelColor: { random: { palette: defaultRandomLabelColorPalette } },
  labelVisibility: { value: defaultLabelVisibility },
  labelOpacity: { value: defaultLabelOpacity },
} as const satisfies Partial<RawLabels>;

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
   * @defaultValue {@link labelsDefaults.labelColor}
   */
  labelColor?: ColorConfig;

  /**
   * Label visibility
   *
   * @defaultValue {@link labelsDefaults.labelVisibility}
   */
  labelVisibility?: VisibilityConfig;

  /**
   * Label opacity
   *
   * @defaultValue {@link labelsDefaults.labelOpacity}
   */
  labelOpacity?: OpacityConfig;
}

/**
 * A {@link RawLabels} with {@link labelsDefaults} applied
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
 * Creates a {@link Labels} from a {@link RawLabels} by applying {@link labelsDefaults}
 *
 * @param rawLabels - The raw labels
 * @returns The complete labels with default values applied
 */
export function createLabels(rawLabels: RawLabels): Labels {
  return {
    ...createRenderedDataObject(rawLabels),
    ...structuredClone(labelsDefaults),
    ...structuredClone(rawLabels),
    dataSource: createLabelsDataSource(rawLabels.dataSource),
    layerConfigs: rawLabels.layerConfigs?.map(createLabelsLayerConfig) ?? [],
  };
}

/**
 * Default values for {@link RawLabelsDataSource}
 */
export const labelsDataSourceDefaults = {} as const satisfies Partial<
  RawLabelsDataSource<string>
>;

/**
 * A data source for two-dimensional label masks
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawLabelsDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawLabelsDataSource} with {@link labelsDataSourceDefaults} applied
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
 * Creates a {@link LabelsDataSource} from a {@link RawLabelsDataSource} by applying {@link labelsDataSourceDefaults}
 *
 * @param rawLabelsDataSource - The raw labels data source
 * @returns The complete labels data source with default values applied
 */
export function createLabelsDataSource<TType extends string>(
  rawLabelsDataSource: RawLabelsDataSource<TType>,
): LabelsDataSource<TType> {
  return {
    ...createDataSource(rawLabelsDataSource),
    ...structuredClone(labelsDataSourceDefaults),
    ...structuredClone(rawLabelsDataSource),
  };
}

/**
 * Default values for {@link RawLabelsLayerConfig}
 */
export const labelsLayerConfigDefaults =
  {} as const satisfies Partial<RawLabelsLayerConfig>;

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
 * A {@link RawLabelsLayerConfig} with {@link labelsLayerConfigDefaults} applied
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
 * Creates a {@link LabelsLayerConfig} from a {@link RawLabelsLayerConfig} by applying {@link labelsLayerConfigDefaults}
 *
 * @param rawLabelsLayerConfig - The raw labels layer configuration
 * @returns The complete labels layer configuration with default values applied
 */
export function createLabelsLayerConfig(
  rawLabelsLayerConfig: RawLabelsLayerConfig,
): LabelsLayerConfig {
  return {
    ...createLayerConfig(rawLabelsLayerConfig),
    ...structuredClone(labelsLayerConfigDefaults),
    ...structuredClone(rawLabelsLayerConfig),
  };
}
