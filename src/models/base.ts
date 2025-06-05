import { Transform, ValuesColumn } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelBase {}

/** Base interface for all data (e.g., image, labels, points, shapes) models  */
export interface DataModelBase<
  TDataSource extends DataSourceModelBase<string>,
  TLayerConfig extends DataLayerConfigModelBase,
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
  TDataSource extends PixelsSourceModelBase<string>,
  TLayerConfig extends PixelsLayerConfigModelBase,
> extends DataModelBase<TDataSource, TLayerConfig> {
  /** Physical pixel size, applied before any transformation (defaults to 1) */
  pixelSize?: number;
}

/** Base interface for all table (e.g. labels, points, shapes) models */
export interface TableModelBase<
  TDataSource extends TableSourceModelBase<string>,
  TLayerConfig extends TableLayerConfigModelBase,
  TGroupSettings extends TableGroupSettingsModelBase,
> extends DataModelBase<TDataSource, TLayerConfig> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<string, Map<string, TGroupSettings>>;
}

/** Base interface for all data (e.g., image, labels, points, shapes) source models */
export interface DataSourceModelBase<T extends string> extends ModelBase {
  /** Data source type */
  type: T;
}

/** Base interface for all pixels (e.g., image, labels) source models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsSourceModelBase<T extends string>
  extends DataSourceModelBase<T> {}

/** Base interface for all table (e.g. labels, points, shapes) source models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableSourceModelBase<T extends string>
  extends DataSourceModelBase<T> {}

/** Base interface for all data (e.g., image, labels, points, shapes) layer configuration models */
export interface DataLayerConfigModelBase extends ModelBase {
  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all pixels (e.g., image, labels) layer configuration models */
export interface PixelsLayerConfigModelBase extends DataLayerConfigModelBase {
  /** Layer ID */
  layerId: string;
}

/** Base interface for all table (e.g., labels, points, shapes) layer configuration models */
export interface TableLayerConfigModelBase extends DataLayerConfigModelBase {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | ValuesColumn;
}

/** Base interface for all data group settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableGroupSettingsModelBase extends ModelBase {}
