import { TableGroupsColumn, TableValuesColumn, Transform } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelBase {}

/** Base interface for all data models */
export interface DataModelBase<TDataSource extends DataSourceModelBase<string>>
  extends ModelBase {
  /** Name */
  name: string;

  /** Data source */
  dataSource: TDataSource;
}

/** Base interface for all rendered data models  */
export interface RenderedDataModelBase<
  TDataSource extends DataSourceModelBase<string>,
  TLayerConfig extends LayerConfigModelBase,
> extends DataModelBase<TDataSource> {
  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;

  /** Layer configurations (layer configuration ID -> layer configuration) */
  layerConfigs: Map<string, TLayerConfig>;
}

/** Base interface for all pixel data models */
export interface PixelDataModelBase<
  TDataSource extends DataSourceModelBase<string>,
  TLayerConfig extends LayerConfigModelBase,
> extends RenderedDataModelBase<TDataSource, TLayerConfig> {
  /** Physical pixel size, applied before any transformation (defaults to 1) */
  pixelSize?: number;
}

/** Base interface for all object data models */
export interface ObjectDataModelBase<
  TDataSource extends DataSourceModelBase<string>,
  TLayerConfig extends LayerConfigModelBase,
  TGroupSettings extends GroupSettingsModelBase,
> extends RenderedDataModelBase<TDataSource, TLayerConfig> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<TableGroupsColumn, Map<object, TGroupSettings>>;
}

/** Base interface for all data source models */
export interface DataSourceModelBase<TType extends string> extends ModelBase {
  /** Data source type */
  type: TType;
}

/** Base interface for all layer configuration models */
export interface LayerConfigModelBase extends ModelBase {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | TableValuesColumn;

  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all table group settings models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GroupSettingsModelBase extends ModelBase {}
