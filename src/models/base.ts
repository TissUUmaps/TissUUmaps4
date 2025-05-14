import { Transform, ValuesColumn } from "./types";

/** Base interface for all models */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Model {}

/** Base interface for all data (e.g., image, labels, points, shapes) models */
export interface DataModel<
  TDataSource extends DataDataSourceModel<string>,
  TLayerConfig extends DataLayerConfigModel,
> extends Model {
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

/** Base interface for all groupable data (e.g. labels, points, shapes) models */
export interface GroupableDataModel<
  TDataSource extends DataDataSourceModel<string>,
  TLayerConfig extends DataLayerConfigModel,
  TGroupSettings extends DataGroupSettingsModel,
> extends DataModel<TDataSource, TLayerConfig> {
  /** Group settings (groupVar => group => settings) */
  groupSettings?: Map<string, Map<string, TGroupSettings>>;
}

/** Base interface for all data sources */
export interface DataDataSourceModel<T extends string> extends Model {
  /** Data source type */
  type: T;
}

/** Base interface for all layer configurations */
export interface DataLayerConfigModel extends Model {
  /** Layer ID for all items, or column containing item-wise layer IDs */
  layerId: string | ValuesColumn;

  /** Transformation from data space to layer (e.g. physical) space */
  tf2layer?: Transform;
}

/** Base interface for all static layer configurations */
export interface StaticDataLayerConfigModel extends DataLayerConfigModel {
  /** Layer ID */
  layerId: string;
}

/** Base interface for all data group settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataGroupSettingsModel extends Model {}
