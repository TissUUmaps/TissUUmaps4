import { SimilarityTransform, TableValuesColumn } from "../types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawModel {}

type DefaultedModelKeys = keyof Omit<RawModel, never>;

export type Model = Required<Pick<RawModel, DefaultedModelKeys>> &
  Omit<RawModel, DefaultedModelKeys>;

export function createModel(rawModel: RawModel): Model {
  return { ...rawModel };
}

/** Base interface for all data models */
export interface RawDataModel<TDataSource extends RawDataSource>
  extends RawModel {
  /** ID */
  id: string;

  /** Name */
  name: string;

  /** Data source */
  dataSource: TDataSource;
}

type DefaultedDataModelKeys<TDataSource extends RawDataSource> = keyof Omit<
  RawDataModel<TDataSource>,
  "id" | "name" | "dataSource"
>;

export type DataModel<TDataSource extends RawDataSource> = Required<
  Pick<RawDataModel<TDataSource>, DefaultedDataModelKeys<TDataSource>>
> &
  Omit<RawDataModel<TDataSource>, DefaultedDataModelKeys<TDataSource>>;

export function createDataModel<TDataSource extends RawDataSource>(
  rawDataModel: RawDataModel<TDataSource>,
): DataModel<TDataSource> {
  return { ...createModel(rawDataModel), ...rawDataModel };
}

/** Base interface for all rendered data models  */
export interface RawRenderedDataModel<
  TDataSource extends RawDataSource,
  TLayerConfig extends RawLayerConfig,
> extends RawDataModel<TDataSource> {
  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;

  /** Layer configurations */
  layerConfigs: TLayerConfig[];
}

type DefaultedRenderedDataModelKeys<
  TDataSource extends RawDataSource,
  TLayerConfig extends RawLayerConfig,
> = keyof Omit<
  RawRenderedDataModel<TDataSource, TLayerConfig>,
  "id" | "name" | "dataSource" | "layerConfigs"
>;

export type RenderedDataModel<
  TDataSource extends RawDataSource,
  TLayerConfig extends RawLayerConfig,
> = Required<
  Pick<
    RawRenderedDataModel<TDataSource, TLayerConfig>,
    DefaultedRenderedDataModelKeys<TDataSource, TLayerConfig>
  >
> &
  Omit<
    RawRenderedDataModel<TDataSource, TLayerConfig>,
    DefaultedRenderedDataModelKeys<TDataSource, TLayerConfig>
  >;

export function createRenderedDataModel<
  TDataSource extends RawDataSource,
  TLayerConfig extends RawLayerConfig,
>(
  rawRenderedDataModel: RawRenderedDataModel<TDataSource, TLayerConfig>,
): RenderedDataModel<TDataSource, TLayerConfig> {
  return {
    ...createDataModel(rawRenderedDataModel),
    visibility: true,
    opacity: 1,
    ...rawRenderedDataModel,
  };
}

/** Base interface for all data sources */
export interface RawDataSource<TType extends string = string> extends RawModel {
  /** Data source type */
  type: TType;

  /** Remote URL (absolute or relative to TissUUmaps root) */
  url?: string;

  /** Local path (relative to workspace root) */
  path?: string;
}

type DefaultedDataSourceKeys<TType extends string = string> = keyof Omit<
  RawDataSource<TType>,
  "type" | "url" | "path"
>;

export type DataSource<TType extends string = string> = Required<
  Pick<RawDataSource<TType>, DefaultedDataSourceKeys<TType>>
> &
  Omit<RawDataSource<TType>, DefaultedDataSourceKeys<TType>>;

export function createDataSource<TType extends string = string>(
  rawDataSource: RawDataSource<TType>,
): DataSource<TType> {
  return { ...createModel(rawDataSource), ...rawDataSource };
}

/** Base interface for all layer configurations */
export interface RawLayerConfig extends RawModel {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | TableValuesColumn;

  /** Horizontal reflection, applied before transformation (defaults to false) */
  flip?: boolean;

  /** Transformation from data/object space to layer space (defaults to identity transform) */
  transform?: SimilarityTransform;
}

type DefaultedLayerConfigKeys = keyof Omit<RawLayerConfig, "layerId">;

export type LayerConfig = Required<
  Pick<RawLayerConfig, DefaultedLayerConfigKeys>
> &
  Omit<RawLayerConfig, DefaultedLayerConfigKeys>;

export function createLayerConfig(rawLayerConfig: RawLayerConfig): LayerConfig {
  return {
    ...createModel(rawLayerConfig),
    flip: false,
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    ...rawLayerConfig,
  };
}
