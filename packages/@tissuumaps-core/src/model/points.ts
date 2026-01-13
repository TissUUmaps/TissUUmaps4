import {
  type ColorConfig,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
} from "../types/config";
import { Marker } from "../types/marker";
import {
  type DataSource,
  type LayerConfig,
  type RawDataSource,
  type RawLayerConfig,
  type RawRenderedDataObject,
  type RenderedDataObject,
  createDataSource,
  createLayerConfig,
  createRenderedDataObject,
} from "./base";

export const pointsDefaults = {
  pointMarker: { value: Marker.Disc },
  pointSize: { value: 1 },
  pointColor: { value: { r: 255, g: 255, b: 255 } },
  pointVisibility: { value: true },
  pointOpacity: { value: 1 },
  pointSizeFactor: 1,
};

/**
 * A two-dimensional point cloud
 */
export interface RawPoints extends RawRenderedDataObject<
  RawPointsDataSource<string>,
  RawPointsLayerConfig
> {
  pointMarker?: MarkerConfig;
  pointSize?: SizeConfig;
  pointColor?: ColorConfig;
  pointVisibility?: VisibilityConfig;
  pointOpacity?: OpacityConfig;
  pointSizeFactor?: number;
}

/**
 * A {@link RawPoints} object with default values applied
 */
export type Points = RenderedDataObject<
  PointsDataSource<string>,
  PointsLayerConfig
> &
  Required<Pick<RawPoints, keyof typeof pointsDefaults>> &
  Omit<
    RawPoints,
    | keyof RenderedDataObject<PointsDataSource<string>, PointsLayerConfig>
    | keyof typeof pointsDefaults
  >;

/**
 * Creates a {@link Points} from a {@link RawPoints} by applying default values
 *
 * @param rawPoints - The raw points
 * @returns The complete points with default values applied
 */
export function createPoints(rawPoints: RawPoints): Points {
  return {
    ...createRenderedDataObject(rawPoints),
    ...pointsDefaults,
    ...rawPoints,
    dataSource: createPointsDataSource(rawPoints.dataSource),
    layerConfigs: rawPoints.layerConfigs?.map(createPointsLayerConfig) ?? [],
  };
}

export const pointsDataSourceDefaults = {};

/**
 * A data source for two-dimensional point clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawPointsDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawPointsDataSource} with default values applied
 */
export type PointsDataSource<TType extends string = string> =
  DataSource<TType> &
    Required<
      Pick<RawPointsDataSource<TType>, keyof typeof pointsDataSourceDefaults>
    > &
    Omit<
      RawPointsDataSource<TType>,
      | keyof DataSource<TType>
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      | keyof typeof pointsDataSourceDefaults
    >;

/**
 * Creates a {@link PointsDataSource} from a {@link RawPointsDataSource} by applying default values
 *
 * @param rawPointsDataSource - The raw points data source
 * @returns The complete points data source with default values applied
 */
export function createPointsDataSource<TType extends string>(
  rawPointsDataSource: RawPointsDataSource<TType>,
): PointsDataSource<TType> {
  return {
    ...createDataSource(rawPointsDataSource),
    ...pointsDataSourceDefaults,
    ...rawPointsDataSource,
  };
}

export const pointsLayerConfigDefaults = {};

/**
 * A layer-specific display configuration for two-dimensional point clouds
 */
export interface RawPointsLayerConfig extends RawLayerConfig {
  /**
   * Dimension containing point-wise X coordinates
   *
   * @see {@link "../storage".PointsData.getDimensions}
   */
  x: string;

  /**
   * Dimension containing point-wise Y coordinates
   *
   * @see {@link "../storage".PointsData.getDimensions}
   */
  y: string;
}

/**
 * A {@link RawPointsLayerConfig} with default values applied
 */
export type PointsLayerConfig = LayerConfig &
  Required<Pick<RawPointsLayerConfig, keyof typeof pointsLayerConfigDefaults>> &
  Omit<
    RawPointsLayerConfig,
    | keyof LayerConfig
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof pointsLayerConfigDefaults
  >;

/**
 * Creates a {@link PointsLayerConfig} from a {@link RawPointsLayerConfig} by applying default values
 *
 * @param rawPointsLayerConfig - The raw points layer configuration
 * @returns The complete points layer configuration with default values applied
 */
export function createPointsLayerConfig(
  rawPointsLayerConfig: RawPointsLayerConfig,
): PointsLayerConfig {
  return {
    ...createLayerConfig(rawPointsLayerConfig),
    ...pointsLayerConfigDefaults,
    ...rawPointsLayerConfig,
  };
}
