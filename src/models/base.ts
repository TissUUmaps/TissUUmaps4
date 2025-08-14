import { TableValuesColumn } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IModel {}

/** Base interface for all data models */
export interface IDataModel<TDataSourceModel extends IDataSourceModel>
  extends IModel {
  /** ID */
  id: string;

  /** Name */
  name: string;

  /** Data source */
  dataSource: TDataSourceModel;
}

/** Base interface for all rendered data models  */
export interface IRenderedDataModel<
  TDataSourceModel extends IDataSourceModel,
  TLayerConfigModel extends ILayerConfigModel,
> extends IDataModel<TDataSourceModel> {
  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;

  /** Layer configurations */
  layerConfigs: TLayerConfigModel[];
}

/** Base interface for all data source models */
export interface IDataSourceModel<TType extends string = string>
  extends IModel {
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

  /** Scale factor, converts from data space to physical/layer space (defaults to 1) */
  scale?: number;

  /** Horizontal reflection, before rotation (defaults to false) */
  flip?: boolean;

  /** Rotation around center (images/labels) or origin (points/shapes), in degrees (defaults to 0) */
  rotation?: number;

  /** Translation, in physical/layer coordinates (defaults to 0) */
  translation?: { x: number; y: number };
}
