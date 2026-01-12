import { colorPalettes } from "../palettes";
import { type Color } from "../types/color";
import { Marker } from "../types/marker";
import { type TableGroupsRef, type TableValuesRef } from "../types/tableRef";
import { type ValueMap } from "../types/valueMap";
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
  pointMarker: Marker.Disc,
  pointSize: 1,
  pointSizeUnit: "data" as const,
  pointSizeFactor: 1,
  pointColor: { r: 255, g: 255, b: 255 },
  pointColorPalette: "batlow",
  pointVisibility: true,
  pointOpacity: 1,
};

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
   * Can be specified as:
   * - A single marker to set the same shape for all points
   * - A table column holding numerical {@link Marker} enum values for each point
   * - A table column holding categorical group names for each point; group names are mapped to point markers using {@link pointMarkerMap}
   * - The special value "random" to assign each point a random marker from the available {@link Marker} enum values
   *
   * @defaultValue {@link pointsDefaults.pointMarker}
   */
  pointMarker?: Marker | TableValuesRef | TableGroupsRef | "random";

  /**
   * Point group-to-marker mapping
   *
   * Can be specified as:
   * - ID of a project-global marker map
   * - Object-specific mapping of group names to {@link Marker} enum values
   *
   * Used when {@link pointMarker} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link pointsDefaults.pointMarker})
   */
  pointMarkerMap?: string | ValueMap<Marker>;

  /**
   * Point size
   *
   * Can be specified as:
   * - A single number to set the same size for all points
   * - A table column holding continuous numerical size values for each point
   * - A table column holding categorical group names for each point; group names are mapped to point sizes using {@link pointSizeMap}
   *
   * Point sizes are specified in units configured by {@link pointSizeUnit} and scaled accordingly for display.
   * Additionally, point sizes are scaled by {@link pointSizeFactor} and {@link "./layer".RawLayer.pointSizeFactor}, independent of {@link pointSizeUnit}.
   *
   * @defaultValue {@link pointsDefaults.pointSize}
   */
  pointSize?: number | TableValuesRef | TableGroupsRef;

  /**
   * Point group-to-size mapping
   *
   * Can be specified as:
   * - ID of a project-global size map
   * - Object-specific mapping of group names to size values
   *
   * Used when {@link pointSize} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link pointsDefaults.pointSize})
   */
  pointSizeMap?: string | ValueMap<number>;

  /**
   * Unit in which point sizes are specified
   *
   * Can be one of:
   * - "data": Point sizes are in data (e.g. pixel) dimensions
   * - "layer": Point sizes are in layer (e.g. physical) dimensions
   * - "world": Point sizes are in world (i.e. global) dimensions
   *
   * @defaultValue {@link pointsDefaults.pointSizeUnit}
   */
  pointSizeUnit?: "data" | "layer" | "world";

  /**
   * Object-level point size scaling factor
   *
   * A unitless scaling factor by which all point sizes are multiplied.
   *
   * Can be used to adjust the size of points without changing individual point sizes or the size unit.
   * Note that point sizes are also affected by {@link "./layer".RawLayer.pointSizeFactor} and {@link "./project".Project.drawOptions}.
   *
   * @defaultValue {@link pointsDefaults.pointSizeFactor}
   */
  pointSizeFactor?: number;

  /**
   * Point color
   *
   * Can be specified as:
   * - A single color to set the same color for all points
   * - A table column holding continuous numerical values for each point; values are clipped to {@link pointColorRange}, which is linearly mapped to {@link pointColorPalette}
   * - A table column holding categorical group names for each point; group names are mapped to point colors using {@link pointColorMap}
   * - The special value "randomFromPalette" to assign each point a random color from {@link pointColorPalette}
   *
   * @defaultValue {@link pointsDefaults.pointColor}
   */
  pointColor?: Color | TableValuesRef | TableGroupsRef | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link pointColorPalette}
   *
   * Table values are clipped to this range before mapping them to point colors.
   *
   * Used when {@link pointColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., fall back to "minmax", emitting a warning when in use)
   */
  pointColorRange?: [number, number] | "minmax";

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link colorPalettes}.
   *
   * Used when {@link pointColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link pointsDefaults.pointColorPalette}
   */
  pointColorPalette?: keyof typeof colorPalettes;

  /**
   * Point group-to-color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link pointColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link pointsDefaults.pointColor})
   */
  pointColorMap?: string | ValueMap<Color>;

  /**
   * Point visibility
   *
   * Can be specified as:
   * - A single boolean to set the same visibility for all points
   * - A table column holding numerical values for each point; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each point; group names are mapped to point visibilities using {@link pointVisibilityMap}
   *
   * @defaultValue {@link pointsDefaults.pointVisibility}
   */
  pointVisibility?: boolean | TableValuesRef | TableGroupsRef;

  /**
   * Point group-to-visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link pointVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link pointsDefaults.pointVisibility})
   */
  pointVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Point opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same opacity for all points
   * - A table column holding numerical opacity values in the range [0, 1] for each point
   * - A table column holding categorical group names for each point; group names are mapped to opacities using {@link pointOpacityMap}
   *
   * Note that point opacities are also affected by {@link RawPoints.opacity} and {@link "./layer".RawLayer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link pointsDefaults.pointOpacity}
   */
  pointOpacity?: number | TableValuesRef | TableGroupsRef;

  /**
   * Point group-to-opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link pointOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link pointsDefaults.pointOpacity})
   */
  pointOpacityMap?: string | ValueMap<number>;
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
