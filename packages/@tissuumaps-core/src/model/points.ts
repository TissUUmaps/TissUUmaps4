import {
  type ItemsDataSource,
  type RawItemsDataSource,
  type RawRenderedDataObject,
  type RenderedDataObject,
  createItemsDataSource,
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
  pointMarker: { constant: { value: defaultPointMarker } },
  pointSize: { constant: { value: defaultPointSize } },
  pointColor: { constant: { value: defaultPointColor } },
  pointVisibility: { constant: { value: defaultPointVisibility } },
  pointOpacity: { constant: { value: defaultPointOpacity } },
  pointSizeFactor: 1,
} as const satisfies Partial<RawPoints>;

/**
 * A two-dimensional point cloud
 */
export interface RawPoints extends RawRenderedDataObject<
  RawPointsDataSource<string>
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
   * Note that point sizes are also affected by {@link "./layer".RawLayer.pointSizeFactor} and {@link "./project".RawProject.renderOptions}.
   *
   * @defaultValue {@link pointsDefaults.pointSizeFactor}
   */
  pointSizeFactor?: number;
}

/**
 * A {@link RawPoints} object with {@link pointsDefaults} applied
 */
export type Points = RenderedDataObject<PointsDataSource<string>> &
  Required<Pick<RawPoints, keyof typeof pointsDefaults>> &
  Omit<RawPoints, keyof typeof pointsDefaults>;

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
> extends RawItemsDataSource<TType> {}

/**
 * A {@link RawPointsDataSource} with {@link pointsDataSourceDefaults} applied
 */
export type PointsDataSource<TType extends string = string> =
  ItemsDataSource<TType> &
    Required<
      Pick<RawPointsDataSource<TType>, keyof typeof pointsDataSourceDefaults>
    > &
    Omit<RawPointsDataSource<TType>, keyof typeof pointsDataSourceDefaults>;

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
    ...createItemsDataSource(rawPointsDataSource),
    ...structuredClone(pointsDataSourceDefaults),
    ...structuredClone(rawPointsDataSource),
  };
}
