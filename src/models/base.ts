import { TableValuesColumn, Transform } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IModel {}

/** Base interface for all data models */
export interface IDataModel<TDataSourceModel extends IDataSourceModel<string>>
  extends IModel {
  /** Name */
  name: string;

  /** Data source */
  dataSource: TDataSourceModel;
}

/** Base interface for all rendered data models  */
export interface IRenderedDataModel<
  TDataSourceModel extends IDataSourceModel<string>,
  TLayerConfigModel extends ILayerConfigModel,
> extends IDataModel<TDataSourceModel> {
  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;

  /** Rotation, in degrees (defaults to 0) */
  degrees?: number;

  /** Horizontal reflection (defaults to false) */
  flipped?: boolean;

  /** Layer configurations (layer configuration ID -> layer configuration) */
  layerConfigs: Map<string, TLayerConfigModel>;
}

/** Base interface for all pixel data models */
export interface IPixelDataModel<
  TDataSourceModel extends IDataSourceModel<string>,
  TLayerConfigModel extends ILayerConfigModel,
> extends IRenderedDataModel<TDataSourceModel, TLayerConfigModel> {
  /** Physical pixel size (defaults to 1) */
  pixelSize?: number;
}

/** Base interface for all object data models */
export interface IObjectDataModel<
  TDataSourceModel extends IDataSourceModel<string>,
  TLayerConfigModel extends ILayerConfigModel,
  TGroupSettingsModel extends IGroupSettingsModel,
> extends IRenderedDataModel<TDataSourceModel, TLayerConfigModel> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<string, Map<string, TGroupSettingsModel>>;
}

/** Base interface for all data source models */
export interface IDataSourceModel<TType extends string> extends IModel {
  /** Data source type */
  type: TType;

  /** Remote URL (absolute or relative to TissUUmaps root) */
  url?: string;

  /** Local path (relative to workspace root) */
  path?: string;
}

/** Base interface for all layer configuration models */
export interface ILayerConfigModel extends IModel {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | TableValuesColumn;

  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all table group settings models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IGroupSettingsModel extends IModel {}
