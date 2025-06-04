import { Transform, ValuesColumn } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelBase {}

/** Base interface for all entity (e.g., image, labels, points, shapes) models  */
export interface EntityModelBase<
  TDataSource extends TableDataSourceModelBase<string>,
  TLayerConfig extends TableLayerConfigModelBase,
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

/** Base interface for all pixels entity (e.g., image, labels) models */
export interface PixelsModelBase<
  TDataSource extends PixelsDataSourceModelBase<string>,
  TLayerConfig extends PixelsLayerConfigModelBase,
> extends EntityModelBase<TDataSource, TLayerConfig> {
  /** Physical pixel size, applied before any transformation (defaults to 1) */
  pixelSize?: number;
}

/** Base interface for all table entity (e.g. labels, points, shapes) models */
export interface TableModelBase<
  TDataSource extends TableDataSourceModelBase<string>,
  TLayerConfig extends TableLayerConfigModelBase,
  TGroupSettings extends GroupSettingsModelBase,
> extends EntityModelBase<TDataSource, TLayerConfig> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<string, Map<string, TGroupSettings>>;
}

/** Base interface for all data sources */
export interface DataSourceModelBase<T extends string> extends ModelBase {
  /** Data source type */
  type: T;
}

/** Base interface for all pixels (e.g., image, labels) data sources */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsDataSourceModelBase<T extends string>
  extends DataSourceModelBase<T> {}

/** Base interface for all table (e.g. labels, points, shapes) data sources */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableDataSourceModelBase<T extends string>
  extends DataSourceModelBase<T> {}

/** Base interface for all layer configurations */
export interface LayerConfigModelBase extends ModelBase {
  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all pixels (e.g., image, labels) layer configurations */
export interface PixelsLayerConfigModelBase extends LayerConfigModelBase {
  /** Layer ID */
  layerId: string;
}

/** Base interface for all table (e.g., labels, points, shapes) layer configurations */
export interface TableLayerConfigModelBase extends LayerConfigModelBase {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | ValuesColumn;
}

/** Base interface for all data group settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GroupSettingsModelBase extends ModelBase {}
