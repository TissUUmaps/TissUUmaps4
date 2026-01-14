import { identityTransform } from "./constants";
import { type SimilarityTransform } from "./types";

/**
 * Default values for {@link RawModel}
 */
export const modelDefaults = {} as const satisfies Partial<RawModel>;

/**
 * A model
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawModel {}

/**
 * A {@link RawModel} with {@link modelDefaults} applied
 */
export type Model = object &
  Required<Pick<RawModel, keyof typeof modelDefaults>> &
  Omit<
    RawModel,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof object
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents,@typescript-eslint/no-duplicate-type-constituents
    | keyof typeof modelDefaults
  >;

/**
 * Creates a {@link Model} from a {@link RawModel} by applying {@link modelDefaults}
 *
 * @param rawModel - The raw model
 * @returns The complete model with default values applied
 */
export function createModel(rawModel: RawModel): Model {
  return { ...structuredClone(modelDefaults), ...structuredClone(rawModel) };
}

/**
 * Default values for {@link RawDataObject}
 */
export const dataObjectDefaults = {} as const satisfies Partial<
  RawDataObject<RawDataSource<string>>
>;

/**
 * A data object
 */
export interface RawDataObject<
  TRawDataSource extends RawDataSource<string>,
> extends RawModel {
  /** Data object ID */
  id: string;

  /** Human-readable data object name */
  name: string;

  /** Data source */
  dataSource: TRawDataSource;
}

/**
 * A {@link RawDataObject} with {@link dataObjectDefaults} applied
 */
export type DataObject<TDataSource extends DataSource<string>> = Model &
  Required<Pick<RawDataObject<TDataSource>, keyof typeof dataObjectDefaults>> &
  Omit<
    RawDataObject<TDataSource>,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof Model
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents,@typescript-eslint/no-duplicate-type-constituents
    | keyof typeof dataObjectDefaults
  >;

/**
 * Creates a {@link DataObject} from a {@link RawDataObject} by applying {@link dataObjectDefaults}
 *
 * @param rawDataObject - The raw data object
 * @returns The complete data object with default values applied
 */
export function createDataObject<
  TType extends string,
  TRawDataSource extends RawDataSource<TType>,
>(rawDataObject: RawDataObject<TRawDataSource>): DataObject<DataSource<TType>> {
  return {
    ...createModel(rawDataObject),
    ...structuredClone(dataObjectDefaults),
    ...structuredClone(rawDataObject),
    dataSource: createDataSource(rawDataObject.dataSource),
  };
}

/**
 * Default values for {@link RawRenderedDataObject}
 */
export const renderedDataObjectDefaults = {
  visibility: true,
  opacity: 1,
  layerConfigs: [],
} as const satisfies Partial<
  RawRenderedDataObject<RawDataSource<string>, RawLayerConfig>
>;

/**
 * A data object that can be rendered
 */
export interface RawRenderedDataObject<
  TRawDataSource extends RawDataSource<string>,
  TRawLayerConfig extends RawLayerConfig,
> extends RawDataObject<TRawDataSource> {
  /**
   * Data object visibility
   *
   * @defaultValue {@link renderedDataObjectDefaults.visibility}
   */
  visibility?: boolean;

  /**
   * Data object opacity, in the range [0, 1]
   *
   * @defaultValue {@link renderedDataObjectDefaults.opacity}
   */
  opacity?: number;

  /**
   * Layer configurations
   */
  layerConfigs?: TRawLayerConfig[];
}

/**
 * A {@link RawRenderedDataObject} with {@link renderedDataObjectDefaults} applied
 */
export type RenderedDataObject<
  TDataSource extends DataSource<string>,
  TLayerConfig extends LayerConfig,
> = DataObject<TDataSource> &
  Required<
    Pick<
      RawRenderedDataObject<TDataSource, TLayerConfig>,
      keyof typeof renderedDataObjectDefaults
    >
  > &
  Omit<
    RawRenderedDataObject<TDataSource, TLayerConfig>,
    keyof DataObject<TDataSource> | keyof typeof renderedDataObjectDefaults
  >;

/**
 * Creates a {@link RenderedDataObject} from a {@link RawRenderedDataObject} by applying {@link renderedDataObjectDefaults}
 *
 * @param rawRenderedDataObject - The raw rendered data object
 * @returns The complete rendered data object with default values applied
 */
export function createRenderedDataObject<
  TType extends string,
  TRawDataSource extends RawDataSource<TType>,
  TRawLayerConfig extends RawLayerConfig,
>(
  rawRenderedDataObject: RawRenderedDataObject<TRawDataSource, TRawLayerConfig>,
): RenderedDataObject<DataSource<TType>, LayerConfig> {
  return {
    ...createDataObject(rawRenderedDataObject),
    ...structuredClone(renderedDataObjectDefaults),
    ...structuredClone(rawRenderedDataObject),
    layerConfigs:
      rawRenderedDataObject.layerConfigs?.map(createLayerConfig) ?? [],
  };
}

/**
 * Default values for {@link RawDataSource}
 */
export const dataSourceDefaults = {} as const satisfies Partial<
  RawDataSource<string>
>;

/**
 * A data source for data objects
 */
export interface RawDataSource<TType extends string = string> extends RawModel {
  /**
   * Data source type
   */
  type: TType;

  /**
   * Remote URL (absolute or relative to TissUUmaps root)
   */
  url?: string;

  /**
   * Local path (relative to workspace root)
   */
  path?: string;
}

/**
 * A {@link RawDataSource} with {@link dataSourceDefaults} applied
 */
export type DataSource<TType extends string = string> = Model &
  Required<Pick<RawDataSource<TType>, keyof typeof dataSourceDefaults>> &
  Omit<
    RawDataSource<TType>,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof Model
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents,@typescript-eslint/no-duplicate-type-constituents
    | keyof typeof dataSourceDefaults
  >;

/**
 * Creates a {@link DataSource} from a {@link RawDataSource} by applying {@link dataSourceDefaults}
 *
 * @param rawDataSource - The raw data source
 * @returns The complete data source with default values applied
 */
export function createDataSource<TType extends string>(
  rawDataSource: RawDataSource<TType>,
): DataSource<TType> {
  return {
    ...createModel(rawDataSource),
    ...structuredClone(dataSourceDefaults),
    ...structuredClone(rawDataSource),
  };
}
/**
 * Default values for {@link RawLayerConfig}
 */
export const layerConfigDefaults = {
  flip: false,
  transform: identityTransform,
} as const satisfies Partial<RawLayerConfig>;

/**
 * A layer-specific display configuration for rendered data objects
 */
export interface RawLayerConfig extends RawModel {
  /**
   * Layer ID
   *
   * Can be specified as:
   * - An ID of an existing Layer
   * - A table column holding the layer ID values for each item
   */
  layer: string | { table: string; column: string };

  /**
   * Horizontal reflection, applied before transformation
   *
   * @defaultValue {@link layerConfigDefaults.flip}
   */
  flip?: boolean;

  /**
   * Transformation from data object space to layer space
   *
   * @defaultValue {@link layerConfigDefaults.transform}
   */
  transform?: SimilarityTransform;
}

/**
 * A {@link RawLayerConfig} with {@link layerConfigDefaults} applied
 */
export type LayerConfig = Model &
  Required<Pick<RawLayerConfig, keyof typeof layerConfigDefaults>> &
  Omit<
    RawLayerConfig,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    keyof Model | keyof typeof layerConfigDefaults
  >;

/**
 * Creates a {@link LayerConfig} from a {@link RawLayerConfig} by applying {@link layerConfigDefaults}
 *
 * @param rawLayerConfig - The raw layer configuration
 * @returns The complete layer configuration with default values applied
 */
export function createLayerConfig(rawLayerConfig: RawLayerConfig): LayerConfig {
  return {
    ...createModel(rawLayerConfig),
    ...structuredClone(layerConfigDefaults),
    ...structuredClone(rawLayerConfig),
  };
}
