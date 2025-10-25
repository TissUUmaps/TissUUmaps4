import { SimilarityTransform, TableValuesColumn } from "../types";

/**
 * A model
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Model {}

/**
 * {@link Model} properties that have default values
 *
 * @internal
 */
export type ModelKeysWithDefaults = keyof Pick<Model, never>;

/**
 * A {@link Model} with default values applied
 *
 * @internal
 */
export type CompleteModel = Required<Pick<Model, ModelKeysWithDefaults>> &
  Omit<Model, ModelKeysWithDefaults>;

/**
 * Creates a {@link CompleteModel} from a {@link Model} by applying default values
 *
 * @param model - The raw model
 * @returns The complete model with default values applied
 *
 * @internal
 */
export function completeModel(model: Model): CompleteModel {
  return { ...model };
}

/**
 * A data object
 */
export interface DataObject<TDataSource extends DataSource> extends Model {
  /** Data object ID */
  id: string;

  /** Human-readable data object name */
  name: string;

  /** Data source */
  dataSource: TDataSource;
}

/**
 * {@link DataObject} properties that have default values
 *
 * @internal
 */
export type DataObjectKeysWithDefaults<TDataSource extends DataSource> =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-duplicate-type-constituents
  ModelKeysWithDefaults | keyof Pick<DataObject<TDataSource>, never>;

/**
 * A {@link DataObject} with default values applied
 *
 * @internal
 */
export type CompleteDataObject<TDataSource extends DataSource> = Required<
  Pick<DataObject<TDataSource>, DataObjectKeysWithDefaults<TDataSource>>
> &
  Omit<DataObject<TDataSource>, DataObjectKeysWithDefaults<TDataSource>>;

/**
 * Creates a {@link CompleteDataObject} from a {@link DataObject} by applying default values
 *
 * @param dataObject - The raw data object
 * @returns The complete data object with default values applied
 *
 * @internal
 */
export function completeDataObject<TDataSource extends DataSource>(
  dataObject: DataObject<TDataSource>,
): CompleteDataObject<TDataSource> {
  return { ...completeModel(dataObject), ...dataObject };
}

/**
 * Default visibility of {@link RenderedDataObject}
 */
export const DEFAULT_RENDERED_DATA_OBJECT_VISIBILITY: boolean = true;

/**
 * Default opacity of {@link RenderedDataObject}
 */
export const DEFAULT_RENDERED_DATA_OBJECT_OPACITY: number = 1;

/**
 * A data object that can be rendered
 */
export interface RenderedDataObject<
  TDataSource extends DataSource,
  TLayerConfig extends LayerConfig,
> extends DataObject<TDataSource> {
  /**
   * Data object visibility
   *
   * @defaultValue {@link DEFAULT_RENDERED_DATA_OBJECT_VISIBILITY}
   */
  visibility?: boolean;

  /**
   * Data object opacity, in the range [0, 1]
   *
   * @defaultValue {@link DEFAULT_RENDERED_DATA_OBJECT_OPACITY}
   */
  opacity?: number;

  /**
   * Layer configurations
   */
  layerConfigs: TLayerConfig[];
}

/**
 * {@link RenderedDataObject} properties that have default values
 *
 * @internal
 */
export type RenderedDataObjectKeysWithDefaults<
  TDataSource extends DataSource,
  TLayerConfig extends LayerConfig,
> =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | DataObjectKeysWithDefaults<TDataSource>
  | keyof Pick<
      RenderedDataObject<TDataSource, TLayerConfig>,
      "visibility" | "opacity"
    >;

/**
 * A {@link RenderedDataObject} with default values applied
 *
 * @internal
 */
export type CompleteRenderedDataObject<
  TDataSource extends DataSource,
  TLayerConfig extends LayerConfig,
> = Required<
  Pick<
    RenderedDataObject<TDataSource, TLayerConfig>,
    RenderedDataObjectKeysWithDefaults<TDataSource, TLayerConfig>
  >
> &
  Omit<
    RenderedDataObject<TDataSource, TLayerConfig>,
    RenderedDataObjectKeysWithDefaults<TDataSource, TLayerConfig>
  >;

/**
 * Creates a {@link CompleteRenderedDataObject} from a {@link RenderedDataObject} by applying default values
 *
 * @param renderedDataObject - The raw rendered data object
 * @returns The complete rendered data object with default values applied
 *
 * @internal
 */
export function completeRenderedDataObject<
  TDataSource extends DataSource,
  TLayerConfig extends LayerConfig,
>(
  renderedDataObject: RenderedDataObject<TDataSource, TLayerConfig>,
): CompleteRenderedDataObject<TDataSource, TLayerConfig> {
  return {
    ...completeDataObject(renderedDataObject),
    visibility: DEFAULT_RENDERED_DATA_OBJECT_VISIBILITY,
    opacity: DEFAULT_RENDERED_DATA_OBJECT_OPACITY,
    ...renderedDataObject,
  };
}

/**
 * A data source for data objects
 */
export interface DataSource<TType extends string = string> extends Model {
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
 * {@link DataSource} properties that have default values
 *
 * @internal
 */
export type DataSourceKeysWithDefaults<TType extends string = string> =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-duplicate-type-constituents
  ModelKeysWithDefaults | keyof Pick<DataSource<TType>, never>;

/**
 * A {@link DataSource} with default values applied
 *
 * @internal
 */
export type CompleteDataSource<TType extends string = string> = Required<
  Pick<DataSource<TType>, DataSourceKeysWithDefaults<TType>>
> &
  Omit<DataSource<TType>, DataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompleteDataSource} from a {@link DataSource} by applying default values
 *
 * @param dataSource - The raw data source
 * @returns The complete data source with default values applied
 *
 * @internal
 */
export function completeDataSource<TType extends string = string>(
  dataSource: DataSource<TType>,
): CompleteDataSource<TType> {
  return { ...completeModel(dataSource), ...dataSource };
}

/**
 * Default horizontal reflection of {@link LayerConfig}
 */
export const DEFAULT_LAYER_CONFIG_FLIP: boolean = false;

/**
 * Default transformation from data object space to layer space of {@link LayerConfig}
 */
export const DEFAULT_LAYER_CONFIG_TRANSFORM: SimilarityTransform = {
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
};

/**
 * A layer-specific display configuration for rendered data objects
 */
export interface LayerConfig extends Model {
  /**
   * Layer ID
   *
   * Can be specified as:
   * - An ID of an existing Layer
   * - A table column holding the layer ID values for each item
   */
  layerId: string | TableValuesColumn;

  /**
   * Horizontal reflection, applied before transformation
   *
   * @defaultValue {@link DEFAULT_LAYER_CONFIG_FLIP}
   */
  flip?: boolean;

  /**
   * Transformation from data object space to layer space
   *
   * @defaultValue {@link DEFAULT_LAYER_CONFIG_TRANSFORM}
   */
  transform?: SimilarityTransform;
}

/**
 * {@link LayerConfig} properties that have default values
 *
 * @internal
 */
export type LayerConfigKeysWithDefaults =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ModelKeysWithDefaults | keyof Pick<LayerConfig, "flip" | "transform">;

/**
 * A {@link LayerConfig} with default values applied
 *
 * @internal
 */
export type CompleteLayerConfig = Required<
  Pick<LayerConfig, LayerConfigKeysWithDefaults>
> &
  Omit<LayerConfig, LayerConfigKeysWithDefaults>;

/**
 * Creates a {@link CompleteLayerConfig} from a {@link LayerConfig} by applying default values
 *
 * @param layerConfig - The raw layer configuration
 * @returns The complete layer configuration with default values applied
 *
 * @internal
 */
export function completeLayerConfig(
  layerConfig: LayerConfig,
): CompleteLayerConfig {
  return {
    ...completeModel(layerConfig),
    flip: DEFAULT_LAYER_CONFIG_FLIP,
    transform: DEFAULT_LAYER_CONFIG_TRANSFORM,
    ...layerConfig,
  };
}
