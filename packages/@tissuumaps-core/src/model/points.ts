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
import {
  type ColorConfig,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
} from "./configs";
import {
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointVisibility,
} from "./constants";

/**
 * Default values for {@link RawPoints}
 */
export const pointsDefaults = {
  pointMarker: { value: defaultPointMarker },
  pointSize: { value: defaultPointSize },
  pointColor: { value: defaultPointColor },
  pointVisibility: { value: defaultPointVisibility },
  pointOpacity: { value: defaultPointOpacity },
  pointSizeFactor: 1,
} as const satisfies Partial<RawPoints>;

/**
 * A two-dimensional point cloud
 */
export interface RawPoints extends RawRenderedDataObject<
  RawPointsDataSource<string>,
  RawPointsLayerConfig
> {
  /**
   * Point marker
   *
   * @defaultValue {@link pointsDefaults.pointMarker}
   */
  pointMarker?: MarkerConfig;

  /**
   * Point size
   *
   * @defaultValue {@link pointsDefaults.pointSize}
   */
  pointSize?: SizeConfig;

  /**
   * Point color
   *
   * @defaultValue {@link pointsDefaults.pointColor}
   */
  pointColor?: ColorConfig;

  /**
   * Point visibility
   *
   * @defaultValue {@link pointsDefaults.pointVisibility}
   */
  pointVisibility?: VisibilityConfig;

  /**
   * Point opacity
   *
   * @defaultValue {@link pointsDefaults.pointOpacity}
   */
  pointOpacity?: OpacityConfig;

  /**
   * Object-level point size scaling factor
   *
   * A unitless scaling factor by which all point sizes are multiplied.
   *
   * Can be used to adjust the size of points without changing individual point sizes or the size unit.
   * Note that point sizes are also affected by {@link "./layer".RawLayer.pointSizeFactor} and {@link "./project".RawProject.drawOptions}.
   *
   * @defaultValue {@link pointsDefaults.pointSizeFactor}
   */
  pointSizeFactor?: number;
}

/**
 * A {@link RawPoints} object with {@link pointsDefaults} applied
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
 * Creates a {@link Points} from a {@link RawPoints} by applying {@link pointsDefaults}
 *
 * @param rawPoints - The raw points
 * @returns The complete points with default values applied
 */
export function createPoints(rawPoints: RawPoints): Points {
  return {
    ...createRenderedDataObject(rawPoints),
    ...structuredClone(pointsDefaults),
    ...structuredClone(rawPoints),
    dataSource: createPointsDataSource(rawPoints.dataSource),
    layerConfigs: rawPoints.layerConfigs?.map(createPointsLayerConfig) ?? [],
  };
}

/**
 * Default values for {@link RawPointsDataSource}
 */
export const pointsDataSourceDefaults = {} as const satisfies Partial<
  RawPointsDataSource<string>
>;

/**
 * A data source for two-dimensional point clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawPointsDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawPointsDataSource} with {@link pointsDataSourceDefaults} applied
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
 * Creates a {@link PointsDataSource} from a {@link RawPointsDataSource} by applying {@link pointsDataSourceDefaults}
 *
 * @param rawPointsDataSource - The raw points data source
 * @returns The complete points data source with default values applied
 */
export function createPointsDataSource<TType extends string>(
  rawPointsDataSource: RawPointsDataSource<TType>,
): PointsDataSource<TType> {
  return {
    ...createDataSource(rawPointsDataSource),
    ...structuredClone(pointsDataSourceDefaults),
    ...structuredClone(rawPointsDataSource),
  };
}

/**
 * Default values for {@link RawPointsLayerConfig}
 */
export const pointsLayerConfigDefaults =
  {} as const satisfies Partial<RawPointsLayerConfig>;

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
 * A {@link RawPointsLayerConfig} with {@link pointsLayerConfigDefaults} applied
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
 * Creates a {@link PointsLayerConfig} from a {@link RawPointsLayerConfig} by applying {@link pointsLayerConfigDefaults}
 *
 * @param rawPointsLayerConfig - The raw points layer configuration
 * @returns The complete points layer configuration with default values applied
 */
export function createPointsLayerConfig(
  rawPointsLayerConfig: RawPointsLayerConfig,
): PointsLayerConfig {
  return {
    ...createLayerConfig(rawPointsLayerConfig),
    ...structuredClone(pointsLayerConfigDefaults),
    ...structuredClone(rawPointsLayerConfig),
  };
}
