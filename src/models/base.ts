import { Transform, ValuesColumn } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelBase {}

/** Base interface for all object (e.g., image, labels, points, shapes) models  */
export interface ObjectModelBase<
  TDataSource extends ObjectDataSourceModelBase<string>,
  TLayerConfig extends ObjectLayerConfigModelBase,
> extends ModelBase {
  /** Name */
  name: string;

  /** Data source */
  dataSource: TDataSource;

  /** Layer configurations (layer configuration ID -> layer configuration) */
  layerConfigs: Map<string, TLayerConfig>;

  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;
}

/** Base interface for all pixels (e.g., image, labels) models */
export interface PixelsModelBase<
  TDataSource extends PixelsDataSourceModelBase<string>,
  TLayerConfig extends PixelsLayerConfigModelBase,
> extends ObjectModelBase<TDataSource, TLayerConfig> {
  /** Physical pixel size, applied before any transformation (defaults to 1) */
  pixelSize?: number;
}

/** Base interface for all table (e.g. labels, points, shapes) models */
export interface TableModelBase<
  TDataSource extends TableDataSourceModelBase<string>,
  TLayerConfig extends TableLayerConfigModelBase,
  TGroupSettings extends TableGroupSettingsModelBase,
> extends ObjectModelBase<TDataSource, TLayerConfig> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<string, Map<string, TGroupSettings>>;
}

/** Base interface for all object (e.g., image, labels, points, shapes) data source models */
export interface ObjectDataSourceModelBase<T extends string> extends ModelBase {
  /** Data source type */
  type: T;
}

/** Base interface for all pixels (e.g., image, labels) data source models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsDataSourceModelBase<T extends string>
  extends ObjectDataSourceModelBase<T> {}

/** Base interface for all table (e.g. labels, points, shapes) data source models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableDataSourceModelBase<T extends string>
  extends ObjectDataSourceModelBase<T> {}

/** Base interface for all object (e.g., image, labels, points, shapes) layer configuration models */
export interface ObjectLayerConfigModelBase extends ModelBase {
  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all pixels (e.g., image, labels) layer configuration models */
export interface PixelsLayerConfigModelBase extends ObjectLayerConfigModelBase {
  /** Layer ID */
  layerId: string;
}

/** Base interface for all table (e.g., labels, points, shapes) layer configuration models */
export interface TableLayerConfigModelBase extends ObjectLayerConfigModelBase {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | ValuesColumn;
}

/** Base interface for all table group settings models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableGroupSettingsModelBase extends ModelBase {}
